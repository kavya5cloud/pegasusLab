"use client";

import { WebContainer } from "@webcontainer/api";

// A single WebContainer instance is allowed per page; boot lazily and reuse it
// across previews and site builds so npm install caches are shared and a
// second boot never throws.
let bootPromise: Promise<WebContainer> | null = null;

export function getContainer(): Promise<WebContainer> {
  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" });
  }
  return bootPromise;
}
