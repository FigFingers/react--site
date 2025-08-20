/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Google アカウントのプロフィール画像を next/image で表示できるようにする
    domains: [
      "lh3.googleusercontent.com",
      "lh4.googleusercontent.com",
      "lh5.googleusercontent.com",
      "lh6.googleusercontent.com"
    ],
  },
};

export default nextConfig;
