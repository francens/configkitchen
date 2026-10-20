/** Blocchi di contenuto salvati in messages.content (jsonb). */
export type AttachmentRef = {
  type: "attachment";
  id: string;
  name: string;
  mime: string | null;
  path: string;
  kind: string;
};
export type TextBlock = { type: "text"; text: string };
export type SceneUpdateBlock = { type: "scene_update"; summary: string };
export type MessageBlock = TextBlock | AttachmentRef | SceneUpdateBlock;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: MessageBlock[];
  created_at: string;
};

export function messageText(m: { content: unknown }): string {
  const blocks = Array.isArray(m.content) ? (m.content as MessageBlock[]) : [];
  return blocks
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
