import { useCallback, useMemo, type ReactNode } from 'react';
import { useFetchClient, useField } from '@strapi/strapi/admin';
import type { PartialBlock } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/ariakit';

import '@blocknote/ariakit/style.css';

type BlockNoteInputProps = {
  disabled?: boolean;
  hint?: ReactNode;
  label?: ReactNode;
  name: string;
  required?: boolean;
};

type UploadedFile = {
  url?: string;
};

const emptyDocument: PartialBlock[] = [{ type: 'paragraph', content: '' }];

function parseDocument(value: unknown): PartialBlock[] {
  let candidate = value;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      candidate = undefined;
    }
  }

  return Array.isArray(candidate) && candidate.length > 0
    ? candidate as PartialBlock[]
    : emptyDocument;
}

export default function BlockNoteInput({
  disabled = false,
  hint,
  label,
  name,
  required = false,
}: BlockNoteInputProps) {
  const field = useField<PartialBlock[] | string>(name);
  const { post } = useFetchClient();
  const initialContent = useMemo(() => parseDocument(field.value), []);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('fileInfo', JSON.stringify({
      name: file.name,
      alternativeText: file.name.replace(/\.[^.]+$/, ''),
      caption: '',
    }));

    const response = await post<UploadedFile[]>('/upload', formData);
    const uploaded = Array.isArray(response.data) ? response.data[0] : undefined;
    if (!uploaded?.url) throw new Error('图片上传失败 / Image upload failed');
    return uploaded.url;
  }, [post]);

  const editor = useCreateBlockNote({
    initialContent,
    dictionary: zh,
    uploadFile,
  });

  return (
    <section className="sm-blocknote-field" aria-label={typeof label === 'string' ? label : '正文内容'}>
      <label className="sm-blocknote-label">
        {label ?? '正文内容'}{required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {hint ? <p className="sm-blocknote-hint">{hint}</p> : null}
      <div className="sm-blocknote-shell" data-disabled={disabled ? 'true' : 'false'}>
        <BlockNoteView
          editor={editor}
          editable={!disabled}
          theme="light"
          onChange={() => field.onChange(name, editor.document)}
        />
      </div>
      {field.error ? <p className="sm-blocknote-error">{field.error}</p> : null}
      <p className="sm-blocknote-help">
        输入 <kbd>/</kbd> 可插入标题、列表、表格、图片、视频和分隔线；选中文字可设置粗体、颜色、链接与居中。
      </p>
    </section>
  );
}
