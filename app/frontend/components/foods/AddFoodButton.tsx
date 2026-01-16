"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function AddFoodButton() {
  return (
    <Link
      href="/foods/add"
      className="fixed bottom-24 right-4 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 transition-transform z-40"
    >
      <Plus className="w-6 h-6" />
    </Link>
  );
}
