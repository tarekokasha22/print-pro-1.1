"use client";

import { createClient } from "@supabase/supabase-js";

// Print Pro runs fully client-side (local auth + localStorage files); Supabase
// is optional. Fall back to a syntactically-valid placeholder URL so the
// client never throws at import time when env vars are unset.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type FileRecord = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  size: number;
  storage_path: string;
  public_url: string;
  created_at: string;
};

export type ConversionRecord = {
  id: string;
  user_id: string;
  source_file_id: string;
  target_format: string;
  result_file_id: string | null;
  status: "pending" | "done" | "error";
  created_at: string;
};

// Upload file to Supabase Storage
export async function uploadFile(
  file: File,
  userId: string
): Promise<{ path: string; url: string } | null> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("printpro-files")
    .upload(path, file, { upsert: false });

  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("printpro-files")
    .getPublicUrl(path);

  return { path, url: urlData.publicUrl };
}

// Save file metadata to DB
export async function saveFileRecord(
  record: Omit<FileRecord, "id" | "created_at">
): Promise<FileRecord | null> {
  const { data, error } = await supabase
    .from("files")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("DB error:", error);
    return null;
  }
  return data;
}

// Get files for a user
export async function getUserFiles(userId: string): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

// Delete a file
export async function deleteFile(
  fileId: string,
  storagePath: string
): Promise<boolean> {
  const { error: storageError } = await supabase.storage
    .from("printpro-files")
    .remove([storagePath]);

  if (storageError) return false;

  const { error: dbError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  return !dbError;
}
