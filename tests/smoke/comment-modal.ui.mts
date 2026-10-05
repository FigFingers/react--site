// biome-ignore-all lint/security/noSecrets: Japanese fixtures and test literals are false positives.
// biome-ignore-all lint/suspicious/noExplicitAny: 任意形の JSON レスポンスを検査するテストハーネス。

/**
 * CommentModal の実操作スモーク。システム Chrome を playwright-core で駆動する。
 * 専用クリップを作成し、finally でそのクリップ配下だけを物理削除する。
 */
// playwright-core はリポジトリの依存に入れていない（インストールが重いため）。
// 実行前に任意の場所へ `npm i playwright-core` し、そのパスを渡す:
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core npm run smoke:ui
// Chrome はシステムのものを使う（CHROME_PATH で上書き可）。
import { tmpdir } from "node:os";

const PLAYWRIGHT_CORE = process.env.PLAYWRIGHT_CORE;
if (!PLAYWRIGHT_CORE) {
  console.error(
    "PLAYWRIGHT_CORE is not set. See the comment at the top of this file.",
  );
  process.exit(1);
}
const CHROME_PATH =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SHOT_DIR = process.env.SMOKE_SHOT_DIR ?? tmpdir();

const { chromium } = await import(
  `file:///${PLAYWRIGHT_CORE.replace(/\\/g, "/")}/index.mjs`
);
const { encode } = await import("next-auth/jwt");
const { prisma } = await import("@/server/db");

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3000";
// Cookie の domain は BASE と一致していなければ送信されない
const COOKIE_DOMAIN = new URL(BASE).hostname;
const COOKIE_NAME = "__Secure-authjs.session-token"; // next start = production

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  console.error("AUTH_SECRET is not set (run with --env-file=.env.local)");
  process.exit(1);
}

let pass = 0;
let fail = 0;
const failures: string[] = [];
const fixtureClipName = `UIスモーク専用 ${Date.now()}`;
let fixtureClipId: bigint | null = null;
let fixtureUserId: bigint | null = null;
let otherUserId: bigint | null = null;
let fixtureVodId: number | null = null;

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  ✗ ${name}`, detail ?? "");
  }
}

async function cleanupStep(label: string, operation: () => Promise<void>) {
  try {
    await operation();
  } catch (error) {
    fail++;
    const message = `${label}: ${(error as Error).message}`;
    failures.push(message);
    console.error(`後始末失敗 ${message}`);
  }
}

let browser: any = null;

try {
  browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const user = await prisma.user.create({
    data: {
      name: "comment-modal-smoke-user",
      email: `comment-modal-smoke-${Date.now()}-${crypto.randomUUID()}@example.invalid`,
    },
    select: { id: true, name: true, email: true },
  });
  fixtureUserId = user.id;
  // 既存の VOD に頼らない（空の DB でも準備で落ちないように）。後始末で消す。
  const vodNonce = crypto.randomUUID();
  const vod = await prisma.vod.create({
    data: {
      code: `smoke-${vodNonce}`,
      name: `Comment modal UI smoke ${vodNonce}`,
    },
    select: { id: true },
  });
  fixtureVodId = vod.id;
  const fixtureClip = await prisma.clip.create({
    data: {
      userId: user.id,
      vodId: vod.id,
      name: fixtureClipName,
      title: "CommentModal UI smoke fixture",
      startMs: 0,
      endMs: 60_000,
      url: "https://www.netflix.com/watch/1",
    },
    select: { id: true },
  });
  fixtureClipId = fixtureClip.id;
  console.log(`fixture clip: ${fixtureClip.id} (${fixtureClipName})\n`);

  const fixtureCommentButton = (page: any) =>
    page
      .locator("article")
      .filter({
        has: page.getByRole("heading", {
          name: fixtureClipName,
          exact: true,
        }),
      })
      .first()
      .getByRole("button", { name: "コメントを見る" });

  const value = await encode({
    token: {
      uid: String(user.id),
      sub: String(user.id),
      name: user.name,
      email: user.email,
    },
    secret: authSecret,
    salt: COOKIE_NAME,
  });

  // ---- 未ログイン ---------------------------------------------------------
  console.log("未ログインでモーダルを開く");
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });

    const btn = fixtureCommentButton(page);
    await btn.waitFor({ state: "visible", timeout: 10000 });
    check("💬 ボタンがカードに出ている", (await btn.count()) > 0);
    await btn.click();

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    check("モーダルが開く", await dialog.isVisible());
    check(
      "見出しが「コメント」",
      (await dialog.getByRole("heading").first().innerText()).includes(
        "コメント",
      ),
    );
    check(
      "未ログインではログイン導線が出る",
      (await dialog.innerText()).includes("ログインが必要です"),
    );
    check(
      "未ログインでは入力欄が出ない",
      (await dialog.locator("textarea").count()) === 0,
    );

    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached", timeout: 5000 });
    check("Escape で閉じる", (await page.getByRole("dialog").count()) === 0);
    await ctx.close();
  }

  // ---- ログイン済み -------------------------------------------------------
  console.log("\nログイン済みで投稿する");
  const ctx = await browser.newContext();
  await ctx.addCookies([
    {
      name: COOKIE_NAME,
      value,
      domain: COOKIE_DOMAIN,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    },
  ]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  const fixtureButton = fixtureCommentButton(page);
  await fixtureButton.waitFor({ state: "visible", timeout: 10000 });
  await fixtureButton.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 });

  // 一覧は非同期。読み込み中が消えるまで待ってから状態を断定する
  await dialog
    .getByText("読み込み中…")
    .waitFor({ state: "detached", timeout: 10000 })
    .catch(() => {});
  check(
    "空状態の文言が出る",
    (await dialog.innerText()).includes("まだコメントがありません"),
    await dialog.innerText(),
  );

  const textarea = dialog.locator("textarea");
  check("ログイン済みでは入力欄が出る", (await textarea.count()) === 1);

  const submit = dialog.getByRole("button", { name: "コメントする" });
  check("空のとき投稿ボタンは無効", await submit.isDisabled());

  const text = `UIスモーク ${Date.now()}`;
  await textarea.fill(text);
  check(
    "文字数カウンタが反映される",
    (await dialog.innerText()).includes(`${text.length} / 500`),
    await dialog.innerText(),
  );
  check("入力後は投稿ボタンが有効", await submit.isEnabled());

  await submit.click();

  // 投稿完了まで待つ。textarea の中身にも text は入っているので、
  // 一覧に出たことは「コメント項目 (article) の中にある」ことで判定する。
  const posted = dialog.locator("article", { hasText: text });
  await posted.waitFor({ state: "visible", timeout: 15000 });
  await dialog
    .getByRole("button", { name: "コメントする" })
    .waitFor({ state: "visible", timeout: 15000 });

  check("投稿したコメントが一覧に出る", (await posted.count()) === 1);
  const createdComment = await prisma.clipComment.findFirstOrThrow({
    where: {
      clipId: fixtureClip.id,
      userId: user.id,
      body: text,
      deletedAt: null,
    },
    select: { id: true },
  });
  check(
    "投稿後に入力欄が空になる",
    (await textarea.inputValue()) === "",
    await textarea.inputValue(),
  );
  check(
    "空状態の文言が消える",
    !(await dialog.innerText()).includes("まだコメントがありません"),
  );
  check(
    "投稿者名が表示される（null なら「ユーザー」）",
    (await posted.innerText()).includes(user.name ?? "ユーザー"),
    { shown: await posted.innerText(), expected: user.name ?? "ユーザー" },
  );
  check("投稿時刻が表示される", (await posted.locator("time").count()) === 1);

  await page.screenshot({ path: `${SHOT_DIR}/comment-modal.png` });
  console.log(`  (スクリーンショット: ${SHOT_DIR}/comment-modal.png)`);

  // 再オープンでサーバーから読み直せているか
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  await fixtureCommentButton(page).click();
  const dialog2 = page.getByRole("dialog");
  await dialog2.waitFor({ state: "visible", timeout: 5000 });
  const reloaded = dialog2.locator("article", { hasText: text });
  await reloaded.waitFor({ state: "visible", timeout: 10000 });
  check(
    "閉じて開き直すとサーバーから再取得される",
    (await reloaded.count()) === 1,
  );
  check(
    "開き直したとき入力欄は空",
    (await dialog2.locator("textarea").inputValue()) === "",
  );

  // ---- 削除・通報のボタン -------------------------------------------------
  console.log("\n削除・通報のボタン");
  check(
    "自分のコメントには削除ボタンが出る",
    (await reloaded.getByRole("button", { name: /削除/ }).count()) === 1,
  );
  check(
    "自分のコメントには通報ボタンが出ない（消せばよいので）",
    (await reloaded.getByRole("button", { name: /通報/ }).count()) === 0,
  );

  // 削除の確認はネイティブの window.confirm ではなく、モーダル内の確認欄で行う。
  // ネイティブのダイアログが出たらその時点で失敗として記録する。
  let nativeDialogShown = false;
  page.on("dialog", (d: any) => {
    nativeDialogShown = true;
    void d.dismiss();
  });
  const deleteButton = reloaded.getByRole("button", {
    name: "自分のコメントを削除",
  });
  const confirmDelete = reloaded.getByRole("button", {
    name: "削除する",
    exact: true,
  });
  const cancelDelete = reloaded.getByRole("button", {
    name: "キャンセル",
    exact: true,
  });
  // フォーカスは DOM 更新後の requestAnimationFrame で移るので、少し待って判定する
  const becomesFocused = async (locator: any) => {
    try {
      await page.waitForFunction(
        (node: Element) => node === document.activeElement,
        await locator.elementHandle(),
        { timeout: 2000 },
      );
      return true;
    } catch {
      return false;
    }
  };

  await deleteButton.click();
  await confirmDelete.waitFor({ state: "visible", timeout: 5000 });
  check(
    "削除ボタンでモーダル内に確認欄が出て、取り消し側にフォーカスが移る",
    await becomesFocused(cancelDelete),
  );
  await cancelDelete.click();
  await confirmDelete.waitFor({ state: "detached", timeout: 5000 });
  check("キャンセルでは消えない", (await reloaded.count()) === 1);
  check(
    "キャンセルするとフォーカスが削除ボタンへ戻る",
    await becomesFocused(deleteButton),
  );

  // Escape は確認欄だけを閉じる（ネイティブの confirm と同じ）。モーダルは残る。
  await deleteButton.click();
  await confirmDelete.waitFor({ state: "visible", timeout: 5000 });
  await page.keyboard.press("Escape");
  await confirmDelete.waitFor({ state: "detached", timeout: 5000 });
  check(
    "確認欄で Escape を押すと確認欄だけが閉じ、モーダルは残る",
    (await page.getByRole("dialog").count()) === 1 &&
      (await reloaded.count()) === 1,
  );
  check(
    "Escape で確認欄を閉じるとフォーカスが削除ボタンへ戻る",
    await becomesFocused(deleteButton),
  );

  // 削除が失敗する場合。DELETE を止めておき、通信中と失敗後のフォーカスを見る。
  const deleteRoute = `**/api/v1/clips/*/comments/${createdComment.id}`;
  let releaseDelete = () => {};
  const deleteHeld = new Promise<void>((resolve) => {
    releaseDelete = resolve;
  });
  await page.route(deleteRoute, async (route: any) => {
    if (route.request().method() !== "DELETE") return route.continue();
    await deleteHeld;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "smoke", code: "INTERNAL" }),
    });
  });
  await deleteButton.click();
  await confirmDelete.click();
  const deletingButton = reloaded.getByRole("button", {
    name: "削除中…",
    exact: true,
  });
  await deletingButton.waitFor({ state: "visible", timeout: 5000 });
  check(
    "削除の通信中も確認欄が残り、フォーカスがダイアログの外へ落ちない",
    await becomesFocused(deletingButton),
  );
  releaseDelete();
  await cancelDelete.waitFor({ state: "detached", timeout: 5000 });
  check(
    "削除に失敗するとエラーが出て、コメントは残る",
    (await dialog2.getByText("コメントを削除できませんでした。").count()) ===
      1 && (await reloaded.count()) === 1,
  );
  check(
    "削除に失敗するとフォーカスが削除ボタンへ戻る",
    await becomesFocused(deleteButton),
  );
  await page.unroute(deleteRoute);

  await deleteButton.click();
  await confirmDelete.click();
  await reloaded.waitFor({ state: "detached", timeout: 15000 });
  check("確認欄で削除すると一覧から消える", (await reloaded.count()) === 0);
  check("ネイティブの確認ダイアログは出ない", !nativeDialogShown);

  const remaining = await prisma.clipComment.findUnique({
    where: { id: createdComment.id },
    select: { deletedAt: true },
  });
  check(
    "UI からの削除も論理削除",
    remaining !== null && remaining.deletedAt !== null,
    remaining,
  );

  // ---- クリップ所有者による通報と確認済み化 -------------------------------
  // ログイン中のユーザーはクリップ所有者。別ユーザーのコメントを通報すると、
  // 読み直さずにそのコメントの通報サマリー（件数と理由）が出ることを見る。
  console.log("\nクリップ所有者による通報と確認済み化");
  const otherUser = await prisma.user.create({
    data: {
      name: "comment-modal-smoke-other",
      email: `comment-modal-smoke-other-${Date.now()}-${crypto.randomUUID()}@example.invalid`,
    },
    select: { id: true },
  });
  otherUserId = otherUser.id;
  const otherText = `別ユーザーのコメント ${Date.now()}`;
  const otherComment = await prisma.clipComment.create({
    data: { clipId: fixtureClip.id, userId: otherUser.id, body: otherText },
    select: { id: true },
  });

  await page.keyboard.press("Escape");
  await dialog2.waitFor({ state: "detached", timeout: 5000 });
  await fixtureCommentButton(page).click();
  const dialog3 = page.getByRole("dialog");
  await dialog3.waitFor({ state: "visible", timeout: 5000 });
  const others = dialog3.locator("article", { hasText: otherText });
  await others.waitFor({ state: "visible", timeout: 10000 });
  check(
    "通報前はバッジが出ない",
    (await others.getByText(/^通報 \d+$/).count()) === 0,
  );

  await others.getByRole("button", { name: "このコメントを通報" }).click();
  await others.getByRole("button", { name: "送信", exact: true }).click();
  const badge = others.getByText("通報 1", { exact: true });
  await badge.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  check(
    "通報すると、読み直さずにそのコメントへバッジと理由が出る",
    (await badge.count()) === 1 &&
      (await others.getByText("最近の通報理由").count()) === 1 &&
      (await others.getByText("その他", { exact: true }).count()) === 1,
  );
  check(
    "通報ボタンは「通報済み」になる",
    (await others
      .getByRole("button", { name: "このコメントを通報" })
      .innerText()) === "通報済み",
  );

  await others
    .getByRole("button", { name: "問題なしとして確認済みにする" })
    .click();
  await badge.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
  check("確認済みにするとバッジが消える", (await badge.count()) === 0);
  const reports = await prisma.clipCommentReport.findMany({
    where: { commentId: otherComment.id },
    select: { resolvedAt: true, resolution: true },
  });
  check(
    "確認済みにした通報は DB でも dismissed で解決済み",
    reports.length === 1 &&
      reports[0].resolvedAt !== null &&
      reports[0].resolution === "dismissed",
    reports,
  );

  await ctx.close();
} catch (e) {
  fail++;
  failures.push(`EXCEPTION: ${(e as Error).message}`);
  console.error("\nEXCEPTION:", e);
} finally {
  if (browser != null) {
    await cleanupStep("ブラウザー終了", () => browser.close());
  }
  if (fixtureClipId != null) {
    const id = fixtureClipId;
    await cleanupStep("専用クリップの物理削除", async () => {
      const r = await prisma.clipComment.deleteMany({
        where: { clipId: id },
      });
      console.log(`\n後始末: 専用コメントを物理削除 ${r.count} 件`);
      await prisma.clip.delete({ where: { id } });
      console.log(`後始末: 専用クリップを物理削除 ${id}`);
    });
  }
  if (otherUserId != null) {
    const id = otherUserId;
    await cleanupStep("別ユーザーの物理削除", async () => {
      await prisma.user.delete({ where: { id } });
      console.log(`後始末: 別ユーザーを物理削除 ${id}`);
    });
  }
  if (fixtureUserId != null) {
    const id = fixtureUserId;
    await cleanupStep("専用ユーザーの物理削除", async () => {
      await prisma.user.delete({ where: { id } });
      console.log(`後始末: 専用ユーザーを物理削除 ${id}`);
    });
  }
  if (fixtureVodId != null) {
    const id = fixtureVodId;
    await cleanupStep("専用VODの物理削除", async () => {
      await prisma.vod.delete({ where: { id } });
      console.log(`後始末: 専用VODを物理削除 ${id}`);
    });
  }
  await cleanupStep("Prisma切断", () => prisma.$disconnect());
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  if (failures.length) for (const f of failures) console.log("  -", f);
  process.exitCode = fail === 0 ? 0 : 1;
}
