"use client";
import Link from "next/link";
import { SidebarData } from "./sidebarData";

function Sidebar() {
  return (
    <div className="sidebar">
      <ul className="sidebarList">
        {SidebarData.map((value) => (
          <li key={value.link}>
            <Link href={value.link} className="row">
              <div className="icon">{value.icon}</div>
              <div className="title">{value.title}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
