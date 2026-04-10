"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = "python",
  height = "400px",
  readOnly = false,
}: CodeEditorProps) {
  const [mounted, setMounted] = useState(false);

  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-gray-400 font-mono">{language}</span>
      </div>
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={() => setMounted(true)}
        theme="vs-dark"
        loading={
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
            에디터 로딩 중...
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 4,
          automaticLayout: true,
          padding: { top: 16 },
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      />
      {!mounted && (
        <div className="h-[400px] bg-gray-900 flex items-center justify-center text-gray-400">
          에디터를 불러오는 중...
        </div>
      )}
    </div>
  );
}
