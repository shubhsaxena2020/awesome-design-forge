import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Showroom } from "./Showroom.tsx";

const params = new URLSearchParams(window.location.search);
const brand = params.get("brand") ?? "aurora";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Showroom brandId={brand} />
  </React.StrictMode>,
);
