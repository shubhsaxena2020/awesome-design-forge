import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Showroom } from "./Showroom.tsx";

const params = new URLSearchParams(window.location.search);
const brand = params.get("brand") ?? "aurora";
const diff = params.get("diff");
const diffPair = diff ? (diff.split(",").map((s) => s.trim()).filter(Boolean) as [string, string]) : undefined;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Showroom brandId={brand} diffPair={diffPair} />
  </React.StrictMode>,
);
