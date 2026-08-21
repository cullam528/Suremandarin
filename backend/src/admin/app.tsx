import { createElement, type ReactNode } from 'react';
import { getFetchClient, type StrapiApp } from '@strapi/strapi/admin';
import { Editor as SlateEditor, Transforms, type Editor } from 'slate';

import AuthLogo from './assets/suremandarin-logo.png';
import MenuLogo from './assets/suremandarin-icon.png';

const themeVersion = 'suremandarin-v12';

if (typeof window !== 'undefined' && localStorage.getItem('SUREMANDARIN_ADMIN_THEME_VERSION') !== themeVersion) {
  localStorage.setItem('STRAPI_THEME', 'light');
  localStorage.setItem('SUREMANDARIN_ADMIN_THEME_VERSION', themeVersion);
}

const brandColors = {
  neutral0: '#FFFFFF',
  neutral100: '#F5F8FC',
  neutral150: '#E7EEF7',
  neutral200: '#D9E4F0',
  neutral300: '#C4D2E1',
  neutral400: '#9AAEC3',
  neutral500: '#6E839A',
  neutral600: '#5D6B7E',
  neutral700: '#465468',
  neutral800: '#344155',
  neutral900: '#263247',
  neutral1000: '#182337',
  primary100: '#EAF4FF',
  primary200: '#CFE7FF',
  primary500: '#2E7BFF',
  primary600: '#1565FF',
  primary700: '#0D4FD6',
  buttonPrimary500: '#2E7BFF',
  buttonPrimary600: '#1565FF',
  secondary100: '#E8FBFF',
  secondary200: '#C5F4FC',
  secondary500: '#21C7E7',
  secondary600: '#00B6F0',
  secondary700: '#008FBF',
  alternative100: '#EAFBF7',
  alternative200: '#C9F5E9',
  alternative500: '#56DEC1',
  alternative600: '#33D6B5',
  alternative700: '#1BA889',
};

const simplifiedChinese = {
  'Auth.form.button.login': '登录后台',
  'Auth.form.email.label': '邮箱',
  'Auth.form.email.placeholder': '请输入管理员邮箱',
  'Auth.form.password.label': '密码',
  'Auth.form.rememberMe.label': '记住我',
  'Auth.form.welcome.title': '努力成为优秀中文培训机构',
  'Auth.form.welcome.subtitle': '登录后即可管理网站、App 和小程序内容',
  'Auth.link.forgot-password': '忘记密码？',
  'HomePage.head.title': '工作台',
  'HomePage.header.title': '你好，{name}',
  'HomePage.header.subtitle': '欢迎回来，请从左侧菜单选择需要管理的内容',
  'global.content-manager': '内容管理',
  'global.plugins.content-manager': '内容管理',
  'global.settings': '系统设置',
  'HeaderLayout.button.label-add-entry': '发表内容',
  'containers.edit.title.new': '发表内容（记得中英文各编辑一次！）',
  'containers.Edit.pluginHeader.title.new': '发表内容（记得中英文各编辑一次！）',
  'components.SureMandarin.blocks.centered': '居中段落',
  'components.SureMandarin.blocks.image': '图片',
  'components.SureMandarin.blocks.video': '视频',
  'components.SureMandarin.blocks.divider': '分隔线',
};

type BlockRenderProps = {
  attributes: Record<string, unknown>;
  children: ReactNode;
  element?: Record<string, unknown>;
};

function selectedBlockPath(editor: Editor) {
  const [, lastNodePath] = SlateEditor.last(editor, []);
  Transforms.unwrapNodes(editor, {
    match: (node) => !SlateEditor.isEditor(node) && (node as { type?: string }).type === 'list',
    split: true,
    at: editor.selection ?? lastNodePath,
  });
  const [, updatedLastNodePath] = SlateEditor.last(editor, []);
  return SlateEditor.above(editor, {
    match: (node) => !SlateEditor.isEditor(node) && !['text', 'link'].includes((node as { type?: string }).type ?? ''),
    at: editor.selection ?? updatedLastNodePath,
  })?.[1];
}

function convertSelectedBlock(editorValue: unknown, type: string) {
  const editor = editorValue as Editor;
  const path = selectedBlockPath(editor);
  if (!path) return;
  Transforms.setNodes(editor, { type } as never, { at: path });
}

function convertSelectedBlockWithText(editorValue: unknown, type: string, text: string) {
  const editor = editorValue as Editor;
  const path = selectedBlockPath(editor);
  if (!path) return;
  Transforms.removeNodes(editor, { at: path });
  Transforms.insertNodes(editor, {
    type,
    children: [{ type: 'text', text }],
  } as never, { at: path });
  Transforms.select(editor, [...path, 0]);
}

function readBlockText(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const item = value as { text?: unknown; children?: unknown[] };
  if (typeof item.text === 'string') return item.text;
  return Array.isArray(item.children) ? item.children.map(readBlockText).join('') : '';
}

function getVideoPreview(url: string): { kind: 'file' | 'embed'; src: string } | null {
  const trimmed = url.trim();
  if (/\.(mp4|webm|ogg|mov|m4v|m3u8)(?:[?#].*)?$/i.test(trimmed)) return { kind: 'file', src: trimmed };
  const youtubeId = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)?.[1];
  if (youtubeId) return { kind: 'embed', src: `https://www.youtube.com/embed/${youtubeId}` };
  const vimeoId = trimmed.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
  if (vimeoId) return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeoId}` };
  return null;
}

function renderCenteredBlock({ attributes, children }: BlockRenderProps) {
  return createElement('p', { ...attributes, style: { textAlign: 'center', padding: '6px 0', color: '#25324A' } }, children);
}

function renderVideoBlock({ attributes, children, element }: BlockRenderProps) {
  const url = readBlockText(element ?? children);
  const preview = getVideoPreview(url);
  return createElement('div', {
    ...attributes,
    style: { border: '1px dashed #91B8FF', borderRadius: '12px', background: '#F5F8FF', padding: '12px 16px', margin: '8px 0' },
  }, [
    createElement('div', { key: 'label', contentEditable: false, style: { color: '#246BFE', fontSize: '12px', fontWeight: 700, marginBottom: '6px' } }, '视频链接 / Video URL'),
    preview?.kind === 'file'
      ? createElement('video', { key: 'preview', src: preview.src, controls: true, style: { width: '100%', maxHeight: '240px', borderRadius: '10px', background: '#101828', marginBottom: '8px' } })
      : preview?.kind === 'embed'
        ? createElement('iframe', { key: 'preview', src: preview.src, title: 'Video preview', allowFullScreen: true, style: { width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: '10px', background: '#101828', marginBottom: '8px' } })
        : null,
    createElement('div', { key: 'content', style: { minHeight: '24px', color: '#52627A' } }, children),
  ]);
}

function renderDividerBlock({ attributes, children }: BlockRenderProps) {
  return createElement('div', { ...attributes, style: { padding: '10px 0' } }, [
    createElement('hr', { key: 'rule', style: { border: 0, borderTop: '1px solid #D9E4F0' } }),
    createElement('span', { key: 'children', style: { display: 'none' } }, children),
  ]);
}

export default {
  config: {
    auth: {
      logo: AuthLogo,
    },
    menu: {
      logo: MenuLogo,
    },
    locales: ['zh-Hans', 'en'],
    notifications: {
      releases: false,
    },
    tutorials: false,
    theme: {
      light: {
        colors: brandColors,
      },
      dark: {
        colors: {
          ...brandColors,
          neutral0: '#171C26',
          neutral100: '#202733',
          neutral150: '#2A3341',
          neutral200: '#354052',
          neutral300: '#475468',
          neutral400: '#748196',
          neutral500: '#9BA7B8',
          neutral600: '#C0C8D4',
          neutral700: '#D9DFE8',
          neutral800: '#EAF0F6',
          neutral900: '#F5F7FA',
          neutral1000: '#FFFFFF',
          buttonNeutral0: '#FFFFFF',
          primary100: '#102A4D',
          primary200: '#123B70',
          primary500: '#4C8DFF',
          primary600: '#66A0FF',
          primary700: '#8AB8FF',
          buttonPrimary500: '#4C8DFF',
          buttonPrimary600: '#66A0FF',
        },
      },
    },
    translations: {
      en: simplifiedChinese,
      'zh-Hans': simplifiedChinese,
    },
  },
  register(app: StrapiApp) {
    app.customFields.register({
      name: 'blocknote',
      type: 'json',
      intlLabel: {
        id: 'global.blocknote.label',
        defaultMessage: 'BlockNote 可视化正文',
      },
      intlDescription: {
        id: 'global.blocknote.description',
        defaultMessage: '所见即所得编辑器，支持图片、视频、表格、列表和文字对齐',
      },
      components: {
        Input: async () => import('./components/BlockNoteInput'),
      },
    });

    const contentManager = app.getPlugin('content-manager');
    contentManager?.apis.addRichTextBlocks((previous) => ({
      ...previous,
      ...(previous.image ? {
        image: {
          ...previous.image,
          label: { id: 'components.SureMandarin.blocks.image', defaultMessage: '图片' },
        },
      } : {}),
      centered: {
        isInBlocksSelector: true,
        label: { id: 'components.SureMandarin.blocks.centered', defaultMessage: '居中段落' },
        renderElement: renderCenteredBlock as never,
        matchNode: (node: { type?: string }) => node.type === 'centered',
        handleConvert: (editor: unknown) => convertSelectedBlock(editor, 'centered'),
      },
      video: {
        isInBlocksSelector: true,
        label: { id: 'components.SureMandarin.blocks.video', defaultMessage: '视频' },
        renderElement: renderVideoBlock as never,
        matchNode: (node: { type?: string }) => node.type === 'video',
        handleConvert: (editor: unknown) => {
          const adminWindow = window as typeof window & { __smPendingVideoUrl?: string };
          const pendingUrl = adminWindow.__smPendingVideoUrl;
          delete adminWindow.__smPendingVideoUrl;
          const url = pendingUrl ?? window.prompt('请输入视频链接 / Enter video URL');
          if (url?.trim()) convertSelectedBlockWithText(editor, 'video', url.trim());
        },
      },
      divider: {
        isInBlocksSelector: true,
        label: { id: 'components.SureMandarin.blocks.divider', defaultMessage: '分隔线' },
        renderElement: renderDividerBlock as never,
        matchNode: (node: { type?: string }) => node.type === 'divider',
        handleConvert: (editor: unknown) => convertSelectedBlock(editor, 'divider'),
      },
    }));
  },

  bootstrap(_app: StrapiApp) {
    document.title = 'SureMandarin 内容管理后台';
    const styleId = 'suremandarin-admin-design';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        :root {
          --sm-ink: #162033;
          --sm-muted: #738096;
          --sm-blue: #246BFE;
          --sm-cyan: #18B9D4;
          --sm-line: #E7ECF3;
          --sm-surface: #FFFFFF;
          --sm-canvas: #F7F9FC;
          --sm-shadow: 0 16px 40px rgba(38, 53, 78, .08);
          --sm-page-background:
            radial-gradient(circle at 9% 8%, rgba(110, 222, 218, .22), transparent 27%),
            radial-gradient(circle at 92% 8%, rgba(180, 191, 255, .24), transparent 30%),
            linear-gradient(135deg, #F5FCFD 0%, #F3F6FF 52%, #F7F8FF 100%);
        }

        html, body {
          background: var(--sm-canvas) !important;
          color: var(--sm-ink) !important;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif !important;
        }

        header {
          background: rgba(255, 255, 255, .92) !important;
          border-bottom: 1px solid var(--sm-line) !important;
          box-shadow: 0 4px 18px rgba(38, 53, 78, .04) !important;
          backdrop-filter: blur(18px);
        }

        nav {
          width: 248px !important;
          background: #FFFFFF !important;
          border-right: 1px solid var(--sm-line) !important;
          box-shadow: 8px 0 28px rgba(38, 53, 78, .035) !important;
          color: var(--sm-ink) !important;
          padding: 16px 10px 22px !important;
        }

        .sm-nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          margin: 0 4px 16px;
          padding: 0 10px;
          border-bottom: 1px solid var(--sm-line);
          color: #1C2A3E;
          font-size: 15px;
          font-weight: 760;
          letter-spacing: -.01em;
        }

        .sm-nav-brand img {
          width: 30px;
          height: 30px;
          object-fit: contain;
        }

        .sm-native-brand-row {
          display: none !important;
        }

        nav a,
        nav button {
          position: relative;
          min-height: 38px !important;
          border-radius: 11px !important;
          margin: 3px 4px !important;
          color: #5C6B80 !important;
          font-size: 13px !important;
          font-weight: 550 !important;
          transition: background .18s ease, transform .18s ease, color .18s ease !important;
        }

        /* Strapi renders the desktop menu as icon-only links with tooltips.
           Keep the rail expanded and put the project name directly beside each
           icon so the navigation is readable without hover. */
        nav a[aria-label],
        nav button[aria-label] {
          display: flex !important;
          width: 100% !important;
          min-width: 100% !important;
          justify-content: flex-start !important;
          gap: 11px !important;
          padding: 0 12px !important;
        }

        nav li {
          width: 100% !important;
        }

        nav a[aria-label]::after,
        nav button[aria-label]::after {
          content: none !important;
        }

        .sm-nav-item-label {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: inherit;
          font-size: 13px;
          font-weight: 560;
        }

        nav a[aria-label] svg,
        nav button[aria-label] svg {
          flex: 0 0 20px;
        }

        nav a:hover,
        nav button:hover,
        nav a[aria-current="page"] {
          background: #EEF4FF !important;
          color: var(--sm-blue) !important;
          transform: translateX(2px);
        }

        /* The Strapi navigation already provides expandable groups. These rules
           turn them into a light, tree-like hierarchy with clear indentation. */
        nav ul,
        nav ol {
          list-style: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        nav ul ul,
        nav ol ol {
          margin-left: 14px !important;
          padding-left: 12px !important;
          border-left: 1px solid #E8EDF4 !important;
        }

        nav ul ul a,
        nav ol ol a {
          min-height: 34px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
        }

        nav ul ul ul a,
        nav ol ol ol a {
          min-height: 31px !important;
          font-size: 11px !important;
          color: #8290A2 !important;
        }

        nav button[aria-expanded] {
          min-height: 44px !important;
          color: #27354A !important;
          font-size: 14px !important;
          font-weight: 700 !important;
        }

        nav button[aria-expanded]::after {
          content: '';
          width: 6px;
          height: 6px;
          margin-left: auto;
          border-right: 1.5px solid #8B98AA;
          border-bottom: 1.5px solid #8B98AA;
          transform: rotate(45deg) translateY(-2px);
          transition: transform .18s ease;
        }

        nav button[aria-expanded="true"]::after {
          transform: rotate(225deg) translate(-1px, -1px);
        }

        nav button[aria-expanded="true"] {
          background: #F5F8FD !important;
        }

        /* Keep the Strapi mobile drawer full-height. The desktop navigation
           width rules otherwise make the responsive drawer collapse into a
           small block at the top-left of the viewport. */
        @media (max-width: 768px) {
          nav {
            box-sizing: border-box !important;
            width: min(84vw, 300px) !important;
            min-width: 260px !important;
            max-width: 300px !important;
            min-height: 100dvh !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            padding: max(12px, env(safe-area-inset-top)) 10px max(18px, env(safe-area-inset-bottom)) !important;
          }

          nav a[aria-label],
          nav button[aria-label] {
            width: calc(100% - 8px) !important;
            min-width: 0 !important;
            max-width: none !important;
          }

          .sm-nav-brand {
            width: calc(100% - 8px) !important;
            box-sizing: border-box !important;
            margin-top: 4px !important;
          }
        }

        .sm-content-tree {
          display: grid;
          gap: 4px;
          margin: 0;
          padding: 12px 10px 20px;
        }

        .sm-content-manager-nav [data-sm-content-native-hidden="true"],
        .sm-content-builder-nav [data-sm-content-native-hidden="true"] {
          display: none !important;
        }

        .sm-content-builder-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          margin: 0 0 8px;
        }

        .sm-content-builder-action {
          min-height: 36px !important;
          padding: 0 8px !important;
          border: 1px solid #DCE7F5 !important;
          border-radius: 12px !important;
          background: #FFFFFF !important;
          color: #52647B !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          box-shadow: none !important;
        }

        .sm-content-builder-action:hover {
          border-color: #9FC2FF !important;
          background: #EEF5FF !important;
          color: var(--sm-blue) !important;
          transform: none !important;
        }

        .sm-locale-version-switcher {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin: 12px 0 4px;
          padding: 10px 12px;
          border: 1px solid #DCE7F5;
          border-radius: 14px;
          background: #F7FAFF;
        }

        .sm-locale-version-label {
          margin-right: auto;
          color: #52647B;
          font-size: 12px;
          font-weight: 700;
        }

        .sm-locale-version-button {
          min-height: 34px !important;
          padding: 0 13px !important;
          border: 1px solid #D6E2F2 !important;
          border-radius: 11px !important;
          background: #FFFFFF !important;
          color: #52647B !important;
          font-size: 12px !important;
          font-weight: 750 !important;
          box-shadow: none !important;
        }

        .sm-locale-version-button[data-active="true"] {
          border-color: #8BB5FF !important;
          background: #EAF2FF !important;
          color: var(--sm-blue) !important;
        }

        .sm-locale-version-button:disabled {
          cursor: not-allowed !important;
          opacity: .42 !important;
        }

        .sm-content-group {
          display: grid;
          gap: 2px;
        }

        .sm-content-group-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 40px !important;
          margin: 0 !important;
          padding: 0 12px !important;
          border: 0 !important;
          border-radius: 13px !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #27354A !important;
          font-size: 13px !important;
          font-weight: 760 !important;
          text-align: left;
        }

        .sm-content-group-button:hover,
        .sm-content-group-button[aria-expanded="true"] {
          background: #EEF4FF !important;
          color: var(--sm-blue) !important;
          transform: none !important;
        }

        .sm-content-group-button::after {
          display: none !important;
        }

        .sm-content-group-chevron {
          width: 7px;
          height: 7px;
          margin-right: 3px;
          border-right: 1.5px solid #8796A9;
          border-bottom: 1.5px solid #8796A9;
          transform: rotate(45deg) translateY(-2px);
          transition: transform .18s ease;
        }

        .sm-content-group-button[aria-expanded="true"] .sm-content-group-chevron {
          transform: rotate(225deg) translate(-1px, -1px);
        }

        .sm-content-group-list {
          display: grid;
          gap: 2px;
          margin: 0 0 2px 11px;
          padding: 2px 0 2px 12px;
          border-left: 1px solid #E3EAF3;
        }

        .sm-content-group-list[hidden] {
          display: none;
        }

        .sm-content-group-link {
          display: flex;
          align-items: center;
          min-height: 32px;
          padding: 0 10px;
          border-radius: 10px;
          color: #6A7A90;
          font-size: 12px;
          font-weight: 560;
          text-decoration: none !important;
          transition: color .18s ease, background .18s ease, transform .18s ease;
        }

        .sm-content-group-link:hover,
        .sm-content-group-link[aria-current="page"] {
          background: #F1F6FF;
          color: var(--sm-blue);
          transform: translateX(2px);
        }

        [data-sm-content-flat-hidden="true"] {
          display: none !important;
        }

        nav [data-sm-system-hidden="true"],
        [data-sm-system-hidden="true"] {
          display: none !important;
        }

        [data-sm-deploy-item="true"] {
          display: none !important;
        }

        html[data-sm-super-admin="true"] [data-sm-deploy-item="true"] {
          display: revert !important;
        }

        [data-sm-admin-only-item="true"] {
          display: none !important;
        }

        html[data-sm-super-admin="true"] [data-sm-admin-only-item="true"] {
          display: revert !important;
        }

        main {
          min-height: calc(100vh - 64px);
          background: var(--sm-page-background) !important;
        }

        main > div {
          background: transparent !important;
        }

        main .sm-admin-form-surface {
          margin-bottom: 20px;
          padding: clamp(16px, 2vw, 28px) !important;
          border: 1px solid rgba(255, 255, 255, .94) !important;
          border-radius: 26px !important;
          background: rgba(255, 255, 255, .76) !important;
          box-shadow: 0 15px 34px rgba(82, 105, 146, .08) !important;
          backdrop-filter: blur(18px);
        }

        main .sm-admin-table-shell {
          max-width: 100%;
          overflow-x: auto;
          padding: 10px 12px 12px;
          border: 1px solid rgba(255, 255, 255, .94);
          border-radius: 24px;
          background: rgba(255, 255, 255, .7);
          box-shadow: 0 14px 32px rgba(82, 105, 146, .075);
          backdrop-filter: blur(18px);
        }

        main .sm-admin-rounded-surface {
          border-radius: 22px !important;
          overflow: hidden;
        }

        main article.sm-admin-rounded-surface,
        main [role="region"].sm-admin-rounded-surface {
          border-color: rgba(218, 228, 240, .9) !important;
          box-shadow: 0 10px 26px rgba(82, 105, 146, .06) !important;
        }

        /* Content Manager edit pages are composed from Strapi layout boxes,
           not one visual form panel. Decorated runtime hooks below identify
           the header, content canvas, field panels and publishing sidebar so
           the complete editing experience follows the SureMandarin theme. */
        main[data-sm-admin-page="content-entry"] .sm-admin-entry-form {
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header {
          position: relative;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          padding: 18px clamp(18px, 3vw, 38px) 8px !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .sm-auto-translate-button {
          min-height: 36px !important;
          padding: 0 15px !important;
          border: 1px solid #65D8C1 !important;
          border-radius: 11px !important;
          background: linear-gradient(135deg, #E9FBF6 0%, #E8F8FF 100%) !important;
          color: #137B6A !important;
          font-size: 12px !important;
          font-weight: 780 !important;
          white-space: nowrap;
          box-shadow: 0 6px 14px rgba(51, 214, 181, .11) !important;
        }

        .sm-auto-translate-button:hover:not(:disabled) {
          border-color: #33D6B5 !important;
          background: linear-gradient(135deg, #DDF9F1 0%, #DDF5FF 100%) !important;
          color: #0B6658 !important;
          transform: translateY(-1px);
        }

        .sm-auto-translate-button:disabled {
          cursor: not-allowed !important;
          border-color: #D8E3EF !important;
          background: #F2F5F8 !important;
          color: #91A0B2 !important;
          box-shadow: none !important;
          transform: none !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header::before {
          content: 'CONTENT MANAGER / 内容编辑';
          color: #718198;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header > div:first-child {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 14px !important;
          width: 100% !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header > div:first-child > div {
          width: 100% !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header > div:first-child > div:first-child {
          order: 1;
          min-height: 44px;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header > div:first-child > div:nth-child(2) {
          order: 2;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 10px !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header h1 {
          display: flex !important;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          color: #182337 !important;
          font-size: clamp(26px, 3vw, 36px) !important;
          font-weight: 780 !important;
          letter-spacing: -.045em !important;
          line-height: 1.12 !important;
          white-space: nowrap;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header .sm-article-bilingual-notice {
          margin: 0 !important;
          border-radius: 10px;
          font-size: 12px;
          letter-spacing: 0;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header .sm-locale-version-switcher {
          display: grid !important;
          grid-template-columns: minmax(160px, 1fr) auto auto auto;
          flex: 1 1 720px;
          width: auto !important;
          min-width: 0;
          max-width: 100%;
          margin: 0 !important;
          margin-left: auto !important;
          padding: 9px 10px !important;
          border-color: rgba(218, 228, 240, .88);
          border-radius: 16px;
          background: rgba(255, 255, 255, .7);
          box-shadow: 0 8px 22px rgba(82, 105, 146, .05);
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header .sm-locale-version-label {
          margin: 0 !important;
          align-self: center;
          color: #617087;
          font-size: 12px;
          line-height: 1.45;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header > div:last-child {
          display: none !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-header-layout {
          display: grid !important;
          grid-template-columns: minmax(260px, 1fr) minmax(420px, 620px) !important;
          align-items: start !important;
          gap: 16px !important;
          width: 100% !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-title-row,
        main[data-sm-admin-page="content-entry"] .sm-admin-entry-locale-row {
          width: 100% !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-locale-row {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 10px !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-native-locale-controls,
        main[data-sm-admin-page="content-entry"] .sm-native-locale-wrapper {
          display: none !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-workspace {
          margin: 0 clamp(14px, 2.2vw, 34px) 34px !important;
          padding: 8px 0 32px !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-panel,
        main[data-sm-admin-page="content-entry"] .sm-admin-entry-aside {
          border: 1px solid rgba(218, 228, 240, .86) !important;
          border-radius: 22px !important;
          background: rgba(255, 255, 255, .9) !important;
          box-shadow: 0 14px 34px rgba(82, 105, 146, .08) !important;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-aside {
          overflow: hidden;
          position: sticky;
          top: 18px;
        }

        main[data-sm-admin-page="content-entry"] .sm-admin-entry-aside button {
          width: 100% !important;
          min-height: 44px !important;
        }

        main[data-sm-admin-entry-mode="create"] .sm-entry-unused-action {
          display: none !important;
        }

        main[data-sm-admin-page="content-entry"] [role="tablist"] {
          width: fit-content;
          padding: 4px !important;
          border: 1px solid rgba(218, 228, 240, .86) !important;
          border-radius: 14px !important;
          background: rgba(255, 255, 255, .72) !important;
        }

        main[data-sm-admin-page="content-entry"] [role="tab"] {
          min-height: 36px !important;
          padding: 0 14px !important;
          border-radius: 10px !important;
        }

        main[data-sm-admin-page="content-entry"] [role="tab"][data-state="active"],
        main[data-sm-admin-page="content-entry"] [role="tab"][aria-selected="true"] {
          background: #EAF2FF !important;
          color: var(--sm-blue) !important;
        }

        main[data-sm-admin-page="content-entry"] label {
          color: #34445B !important;
          font-weight: 680 !important;
        }

        @media (max-width: 900px) {
          main[data-sm-admin-page="content-entry"] .sm-admin-entry-workspace {
            margin: 0 12px 24px !important;
            padding: 8px 0 24px !important;
          }

          main[data-sm-admin-page="content-entry"] .sm-admin-entry-panel,
          main[data-sm-admin-page="content-entry"] .sm-admin-entry-aside {
            border-radius: 18px !important;
          }

          main[data-sm-admin-page="content-entry"] .sm-admin-entry-header .sm-locale-version-switcher {
            grid-template-columns: 1fr 1fr;
          }

          main[data-sm-admin-page="content-entry"] .sm-admin-entry-header .sm-locale-version-label {
            grid-column: 1 / -1;
          }

          main[data-sm-admin-page="content-entry"] .sm-admin-entry-header .sm-auto-translate-button {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 1100px) {
          main[data-sm-admin-page="content-entry"] .sm-admin-entry-header-layout {
            grid-template-columns: 1fr !important;
          }
        }

        .sm-dashboard-shell {
          min-height: calc(100vh - 88px);
          margin: -24px -32px -32px;
          padding: 34px 42px 56px;
          background: var(--sm-page-background);
          color: var(--sm-ink);
        }

        .sm-dashboard-topbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          max-width: 1240px;
          margin: 0 auto 26px;
        }

        .sm-dashboard-kicker {
          margin: 0 0 9px;
          color: #6E8199;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .sm-dashboard-title {
          margin: 0;
          color: #182337;
          font-size: clamp(30px, 4vw, 46px);
          font-weight: 780;
          letter-spacing: -.055em;
          line-height: 1.05;
        }

        .sm-dashboard-subtitle {
          margin: 11px 0 0;
          color: #6E7D92;
          font-size: 14px;
          line-height: 1.6;
        }

        .sm-dashboard-date {
          display: grid;
          gap: 3px;
          min-width: 154px;
          padding: 15px 18px;
          border: 1px solid rgba(255, 255, 255, .9);
          border-radius: 22px;
          background: rgba(255, 255, 255, .58);
          box-shadow: 0 12px 28px rgba(83, 108, 151, .08);
          color: #687992;
          font-size: 12px;
          text-align: right;
          backdrop-filter: blur(18px);
        }

        .sm-dashboard-date strong {
          color: #1D2B43;
          font-size: 19px;
          letter-spacing: -.03em;
        }

        .sm-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          max-width: 1240px;
          margin: 0 auto;
        }

        .sm-dashboard-section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 18px;
          max-width: 1240px;
          margin: 0 auto 12px;
        }

        .sm-dashboard-grid + .sm-dashboard-section-head {
          margin-top: 28px;
        }

        .sm-dashboard-section-head h2 {
          margin: 0;
          color: #26354C;
          font-size: 16px;
          font-weight: 780;
          letter-spacing: -.02em;
        }

        .sm-dashboard-section-head span {
          color: #8997AA;
          font-size: 12px;
        }

        .sm-dashboard-card {
          position: relative;
          display: grid;
          min-height: 176px;
          padding: 22px 23px 21px;
          border: 1px solid rgba(255, 255, 255, .95);
          border-radius: 28px;
          background: rgba(255, 255, 255, .73);
          box-shadow: 0 15px 32px rgba(82, 105, 146, .09);
          color: #172337;
          text-decoration: none !important;
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
          backdrop-filter: blur(22px);
        }

        .sm-dashboard-card:hover {
          background: rgba(255, 255, 255, .93);
          box-shadow: 0 20px 38px rgba(82, 105, 146, .14);
          transform: translateY(-4px);
        }

        .sm-dashboard-card:focus-visible {
          outline: 3px solid rgba(36, 107, 254, .24);
          outline-offset: 3px;
        }

        .sm-dashboard-card[data-sm-dashboard-action="true"][data-sm-dashboard-has-items="true"] {
          border-color: rgba(215, 122, 25, .32);
          background: rgba(255, 251, 244, .9);
        }

        .sm-dashboard-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .sm-dashboard-card-mark {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, .95);
          border-radius: 13px;
          background: #EAF5FF;
          color: #246BFE;
          font-size: 12px;
          font-weight: 850;
        }

        .sm-dashboard-card-mark[data-tone="green"] {
          background: #E9F9F7;
          color: #16A88B;
        }

        .sm-dashboard-card-mark[data-tone="orange"] {
          background: #FFF2E1;
          color: #D77A19;
        }

        .sm-dashboard-card-mark[data-tone="violet"] {
          background: #F1EEFF;
          color: #7258D8;
        }

        .sm-dashboard-card-mark[data-tone="rose"] {
          background: #FFF0F2;
          color: #D9586A;
        }

        .sm-dashboard-card-mark[data-tone="sky"] {
          background: #EAF8FC;
          color: #1685A8;
        }

        .sm-dashboard-card-arrow {
          color: #90A0B5;
          font-size: 19px;
          line-height: 1;
        }

        .sm-dashboard-card-label {
          margin: 21px 0 0;
          color: #687992;
          font-size: 13px;
          font-weight: 720;
        }

        .sm-dashboard-card-value {
          margin: 3px 0 0;
          color: #172337;
          font-size: 44px;
          font-weight: 790;
          letter-spacing: -.06em;
          line-height: 1;
        }

        .sm-dashboard-card-help {
          align-self: end;
          margin: 18px 0 0;
          color: #8A99AC;
          font-size: 12px;
        }

        .sm-dashboard-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          max-width: 1240px;
          margin: 18px auto 0;
          padding: 19px 23px;
          border: 1px solid rgba(255, 255, 255, .9);
          border-radius: 22px;
          background: rgba(255, 255, 255, .5);
          color: #73839A;
          font-size: 12px;
          backdrop-filter: blur(18px);
        }

        .sm-dashboard-foot a {
          color: #246BFE;
          font-weight: 750;
          text-decoration: none;
        }

        @media (max-width: 900px) {
          .sm-dashboard-shell { margin: -18px -18px -24px; padding: 25px 18px 36px; }
          .sm-dashboard-topbar { align-items: flex-start; flex-direction: column; }
          .sm-dashboard-date { text-align: left; }
          .sm-dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 560px) {
          .sm-dashboard-grid { grid-template-columns: 1fr; }
          .sm-dashboard-section-head { align-items: flex-start; flex-direction: column; gap: 3px; }
        }

        [data-sm-dashboard-hidden="true"] {
          display: none !important;
        }

        button,
        [role="button"] {
          border-radius: 12px !important;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease !important;
        }

        button:not(:disabled):hover,
        [role="button"]:not([aria-disabled="true"]):hover {
          transform: translateY(-1px);
        }

        input,
        textarea,
        select,
        main [role="combobox"],
        main [aria-haspopup="listbox"],
        main [role="listbox"] {
          border-radius: 12px !important;
          border-color: var(--sm-line) !important;
          background: var(--sm-surface) !important;
          min-height: 42px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .8) !important;
        }

        input:focus,
        textarea:focus,
        select:focus,
        main [role="combobox"]:focus-within,
        main [aria-haspopup="listbox"]:focus-visible {
          border-color: var(--sm-blue) !important;
          box-shadow: 0 0 0 3px rgba(21, 101, 255, .14) !important;
        }

        .sm-blocks-quick-actions {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: 8px;
          padding-left: 8px;
          border-left: 1px solid var(--sm-line);
        }

        .sm-blocks-quick-action {
          min-height: 32px !important;
          padding: 0 11px !important;
          border: 1px solid #D8E5F7 !important;
          border-radius: 9px !important;
          background: #F5F8FD !important;
          color: #40536B !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          white-space: nowrap;
        }

        .sm-blocks-quick-action:hover {
          border-color: #A9C8FF !important;
          background: #EAF3FF !important;
          color: var(--sm-blue) !important;
        }

        .sm-blocknote-field {
          width: 100%;
        }

        .sm-blocknote-label {
          display: block;
          margin-bottom: 7px;
          color: var(--sm-ink);
          font-size: 12px;
          font-weight: 700;
        }

        .sm-blocknote-label span,
        .sm-blocknote-error {
          color: #D92D20;
        }

        .sm-blocknote-hint,
        .sm-blocknote-help {
          margin: 0 0 8px;
          color: var(--sm-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .sm-blocknote-shell {
          min-height: 430px;
          overflow: visible;
          border: 1px solid var(--sm-line);
          border-radius: 18px;
          background: #FFFFFF;
          box-shadow: 0 10px 30px rgba(38, 53, 78, .06);
        }

        .sm-blocknote-shell:focus-within {
          border-color: var(--sm-blue);
          box-shadow: 0 0 0 3px rgba(21, 101, 255, .1), 0 14px 34px rgba(38, 53, 78, .08);
        }

        .sm-blocknote-shell[data-disabled="true"] {
          opacity: .65;
          background: #F4F6F8;
        }

        .sm-blocknote-shell .bn-container,
        .sm-blocknote-shell .bn-editor {
          min-height: 428px;
          border-radius: 18px;
          background: transparent;
        }

        .sm-blocknote-shell .bn-editor {
          padding: 30px 42px 64px;
          color: #25324A;
          font-size: 15px;
          line-height: 1.8;
        }

        .sm-blocknote-shell,
        .sm-blocknote-shell * {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif !important;
        }

        .sm-blocknote-error {
          margin: 7px 0 0;
          font-size: 12px;
          font-weight: 650;
        }

        .sm-blocknote-help {
          margin-top: 8px;
        }

        .sm-blocknote-help kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          min-height: 20px;
          padding: 0 5px;
          border: 1px solid #D9E4F0;
          border-radius: 6px;
          background: #FFFFFF;
          color: #40536B;
          font: 700 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
          box-shadow: 0 1px 2px rgba(38, 53, 78, .08);
        }

        .sm-article-bilingual-notice {
          display: inline-flex;
          align-items: center;
          margin-left: 12px;
          padding: 5px 10px;
          border: 1px solid #FECDCA;
          border-radius: 8px;
          background: #FFF4F3;
          color: #D92D20;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.35;
          vertical-align: middle;
        }

        /* Keep the article's publication board visually aligned with Title.
           Strapi normally renders a selected relation as a list below the
           combobox; the small overlay below keeps the selected board name in
           the field while the native combobox remains interactive. */
        main input[name="title"],
        main input[name="category"],
        main input[name$=".category"],
        main [data-sm-category-combobox="true"] {
          box-sizing: border-box !important;
          height: 60px !important;
          min-height: 60px !important;
        }

        main [data-sm-category-combobox="true"] {
          position: relative !important;
        }

        main [data-sm-category-combobox="true"] .sm-category-selected {
          position: absolute;
          inset: 1px 36px 1px 1px;
          z-index: 1;
          display: none;
          align-items: center;
          padding: 0 12px;
          border-radius: 11px;
          background: var(--sm-surface);
          color: var(--sm-ink);
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
          pointer-events: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        main [data-sm-category-combobox="true"][data-sm-category-has-value="true"] .sm-category-selected {
          display: flex;
        }

        main [data-sm-category-combobox="true"][data-sm-category-has-value="true"] input {
          color: transparent !important;
          caret-color: transparent !important;
        }

        main [data-sm-category-list="true"] {
          display: none !important;
        }

        main [data-sm-category-list-container="true"] {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        main .sm-article-primary-row .sm-article-category-item {
          grid-column: span 3 !important;
        }

        main .sm-article-primary-row .sm-article-title-item {
          grid-column: span 9 !important;
        }

        @media (max-width: 1100px) {
          main .sm-article-primary-row .sm-article-category-item,
          main .sm-article-primary-row .sm-article-title-item {
            grid-column: span 12 !important;
          }
        }

        [role="dialog"],
        [role="dialog"] > div,
        [data-radix-popper-content-wrapper] > div {
          border-radius: 20px !important;
          box-shadow: var(--sm-shadow) !important;
        }

        [role="dialog"] {
          border: 1px solid var(--sm-line) !important;
          overflow: hidden;
        }

        /* Primary actions are intentionally larger and easier to find. The
           bootstrap helper below adds these classes based on the visible label. */
        .sm-new-primary,
        .sm-publish-primary {
          min-height: 48px !important;
          padding: 0 21px !important;
          border-radius: 14px !important;
          font-size: 14px !important;
          font-weight: 750 !important;
          letter-spacing: .01em;
          box-shadow: 0 8px 18px rgba(36, 107, 254, .16) !important;
        }

        .sm-new-primary {
          background: linear-gradient(135deg, #246BFE 0%, #4B8EFF 100%) !important;
          color: #fff !important;
        }

        .sm-publish-primary {
          background: linear-gradient(135deg, #16B7D0 0%, #25CDAF 100%) !important;
          color: #fff !important;
        }

        .sm-new-primary:hover,
        .sm-publish-primary:hover {
          box-shadow: 0 11px 24px rgba(36, 107, 254, .22) !important;
          transform: translateY(-2px) !important;
        }

        .sm-new-primary:disabled,
        .sm-new-primary[aria-disabled="true"],
        .sm-publish-primary:disabled,
        .sm-publish-primary[aria-disabled="true"] {
          background: #EEF1F5 !important;
          color: #9AA5B3 !important;
          border-color: #E2E7EE !important;
          box-shadow: none !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        .sm-published-status {
          background: #EEF1F5 !important;
          color: #8E99A8 !important;
          border-color: #E2E7EE !important;
          box-shadow: none !important;
        }

        .sm-published-status.sm-published-available,
        .sm-published-status[aria-selected="true"],
        .sm-published-status[data-state="active"],
        .sm-published-status[data-active="true"] {
          background: #EAF4FF !important;
          color: var(--sm-blue) !important;
          border-color: #CFE1FF !important;
        }

        table {
          border-collapse: separate !important;
          border-spacing: 0 8px !important;
        }

        thead th {
          background: transparent !important;
          color: #6E839A !important;
          font-size: .75rem !important;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        tbody tr {
          background: #fff !important;
          box-shadow: 0 4px 16px rgba(38, 53, 78, .045) !important;
        }

        tbody td:first-child {
          border-radius: 14px 0 0 14px !important;
        }

        tbody td:last-child {
          border-radius: 0 14px 14px 0 !important;
        }

        [aria-label="breadcrumb"] a,
        [aria-label="breadcrumb"] span {
          color: var(--sm-blue) !important;
        }

        img[aria-hidden="true"][alt=""] {
          height: 8.64rem !important;
          width: auto !important;
          border: 0 !important;
          box-shadow: none !important;
          object-fit: contain;
        }

        .sm-contact-user-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin: 0 0 18px;
          padding: 16px 18px;
          border: 1px solid #DCE7F5;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(239,248,255,.82));
          box-shadow: 0 10px 25px rgba(82, 105, 146, .07);
        }

        .sm-contact-user-copy { min-width: 0; }
        .sm-contact-user-copy strong { display: block; color: #182337; font-size: 14px; font-weight: 780; }
        .sm-contact-user-copy span { display: block; margin-top: 3px; overflow: hidden; color: #718198; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .sm-contact-user-button {
          flex: 0 0 auto;
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 12px;
          color: #fff;
          background: linear-gradient(135deg, #246BFE, #18B9D4);
          box-shadow: 0 8px 18px rgba(36, 107, 254, .18);
          cursor: pointer;
          font-size: 13px;
          font-weight: 780;
        }
        .sm-contact-user-button:hover { transform: translateY(-1px); box-shadow: 0 11px 24px rgba(36, 107, 254, .24); }

        .sm-contact-user-overlay {
          position: fixed;
          z-index: 2147483000;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(22, 32, 51, .28);
          backdrop-filter: blur(8px);
        }
        .sm-contact-user-dialog {
          width: min(100%, 620px);
          border: 1px solid #E0E9F3;
          border-radius: 22px;
          padding: 24px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(22, 32, 51, .2);
        }
        .sm-contact-user-dialog h2 { margin: 0; color: #182337; font-size: 20px; font-weight: 800; }
        .sm-contact-user-dialog > p { margin: 6px 0 18px; color: #718198; font-size: 12px; line-height: 1.5; }
        .sm-contact-user-dialog label { display: grid; gap: 7px; margin-top: 13px; color: #34445B; font-size: 12px; font-weight: 750; }
        .sm-contact-user-dialog input,
        .sm-contact-user-dialog textarea { width: 100%; box-sizing: border-box; border: 1px solid #DCE7F5; border-radius: 12px; padding: 11px 12px; color: #182337; background: #FBFDFF; font: inherit; outline: none; }
        .sm-contact-user-dialog input:focus,
        .sm-contact-user-dialog textarea:focus { border-color: #8BB5FF; box-shadow: 0 0 0 3px rgba(36,107,254,.1); }
        .sm-contact-user-dialog textarea { min-height: 170px; resize: vertical; line-height: 1.6; }
        .sm-contact-user-dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
        .sm-contact-user-dialog-actions button { min-height: 40px; border-radius: 11px; padding: 0 15px; font-size: 12px; font-weight: 780; cursor: pointer; }
        .sm-contact-user-cancel { border: 1px solid #DCE7F5; color: #617087; background: #fff; }
        .sm-contact-user-send { border: 0; color: #fff; background: linear-gradient(135deg, #246BFE, #18B9D4); }
        .sm-contact-user-dialog-actions button:disabled { cursor: not-allowed; opacity: .55; }
        .sm-contact-user-status { min-height: 18px; margin: 12px 0 0; color: #16856F; font-size: 12px; line-height: 1.5; }
        .sm-contact-user-status[data-error="true"] { color: #C2410C; }

        @media (max-width: 700px) {
          .sm-contact-user-card { align-items: stretch; flex-direction: column; gap: 12px; }
          .sm-contact-user-button { width: 100%; }
          .sm-contact-user-dialog { padding: 18px; border-radius: 18px; }
        }
      `;
      document.head.appendChild(style);
    }

    const dashboardWindow = window as typeof window & {
      __smDashboardRefreshTimer?: number;
    };

    const isDashboardHome = () => /^\/admin\/?$/.test(window.location.pathname);

    const cleanupDashboardHome = () => {
      document.querySelector('[data-sm-dashboard-root="true"]')?.remove();
      document.querySelectorAll<HTMLElement>('[data-sm-dashboard-hidden="true"]').forEach((element) => {
        element.removeAttribute('data-sm-dashboard-hidden');
      });
      if (!isDashboardHome() && dashboardWindow.__smDashboardRefreshTimer) {
        window.clearInterval(dashboardWindow.__smDashboardRefreshTimer);
        dashboardWindow.__smDashboardRefreshTimer = undefined;
      }
    };

    type DashboardSummary = {
      newMembersToday?: number;
      totalMembers?: number;
      pendingBookings?: number;
      confirmedLessonsToday?: number;
      newInquiriesToday?: number;
      unhandledInquiries?: number;
      pendingRewards?: number;
      pendingTestimonials?: number;
      updatedAt?: string;
    };

    const renderDashboardSummary = (summary: DashboardSummary) => {
      const root = document.querySelector<HTMLElement>('[data-sm-dashboard-root="true"]');
      if (!root) return;
      const values: Record<string, number> = {
        members: Number(summary.newMembersToday ?? 0),
        totalMembers: Number(summary.totalMembers ?? 0),
        bookings: Number(summary.pendingBookings ?? 0),
        lessonsToday: Number(summary.confirmedLessonsToday ?? 0),
        inquiries: Number(summary.newInquiriesToday ?? 0),
        unhandledInquiries: Number(summary.unhandledInquiries ?? 0),
        rewards: Number(summary.pendingRewards ?? 0),
        testimonials: Number(summary.pendingTestimonials ?? 0),
      };
      Object.entries(values).forEach(([key, value]) => {
        const node = root.querySelector<HTMLElement>(`[data-sm-dashboard-value="${key}"]`);
        if (node) {
          node.textContent = new Intl.NumberFormat('zh-CN').format(value);
          const card = node.closest<HTMLElement>('.sm-dashboard-card');
          if (card?.dataset.smDashboardAction === 'true') {
            card.dataset.smDashboardHasItems = value > 0 ? 'true' : 'false';
          }
        }
      });
      const updated = root.querySelector<HTMLElement>('[data-sm-dashboard-updated]');
      if (updated) {
        updated.textContent = summary.updatedAt
          ? `数据更新于 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(summary.updatedAt))}`
          : '数据实时更新';
      }
    };

    const refreshDashboardSummary = async () => {
      if (!isDashboardHome()) return;
      try {
        const response = await fetch('/admin/suremandarin/dashboard-summary', { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const payload = await response.json() as { data?: DashboardSummary };
          if (payload.data) {
            renderDashboardSummary(payload.data);
            return;
          }
        }

        // Some Strapi versions do not attach the admin session middleware to
        // routes added at runtime. Fall back to the authenticated Content
        // Manager endpoints so the dashboard still shows real totals.
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const getTotal = async (uid: string, query = '') => {
          const result = await fetch(`/content-manager/collection-types/${uid}?page=1&pageSize=1${query}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          if (!result.ok) return 0;
          const data = await result.json() as { meta?: { pagination?: { total?: number } } };
          return Number(data.meta?.pagination?.total ?? 0);
        };
        const createdAfter = encodeURIComponent(startOfDay.toISOString());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const createdBefore = encodeURIComponent(endOfDay.toISOString());
        const [
          members,
          totalMembers,
          bookings,
          lessonsToday,
          inquiries,
          unhandledInquiries,
          rewards,
          testimonials,
        ] = await Promise.all([
          getTotal('plugin::users-permissions.user', `&filters[createdAt][$gte]=${createdAfter}`),
          getTotal('plugin::users-permissions.user'),
          getTotal('api::lesson-booking.lesson-booking', '&filters[status][$eq]=requested'),
          getTotal('api::lesson-booking.lesson-booking', `&filters[status][$eq]=confirmed&filters[requestedStartAt][$gte]=${createdAfter}&filters[requestedStartAt][$lt]=${createdBefore}`),
          getTotal('api::inquiry.inquiry', `&filters[createdAt][$gte]=${createdAfter}`),
          getTotal('api::inquiry.inquiry', '&filters[status][$eq]=new'),
          getTotal('api::lesson-credit.lesson-credit', '&filters[status][$eq]=pending-review'),
          getTotal('api::testimonial.testimonial', '&filters[enabled][$eq]=false'),
        ]);
        renderDashboardSummary({
          newMembersToday: members,
          totalMembers,
          pendingBookings: bookings,
          confirmedLessonsToday: lessonsToday,
          newInquiriesToday: inquiries,
          unhandledInquiries,
          pendingRewards: rewards,
          pendingTestimonials: testimonials,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Keep the shell visible if a temporary request fails; the next refresh retries.
      }
    };

    const injectDashboardHome = () => {
      if (!isDashboardHome()) {
        cleanupDashboardHome();
        return;
      }
      const main = document.querySelector<HTMLElement>('main');
      if (!main) return;
      let root = main.querySelector<HTMLElement>('[data-sm-dashboard-root="true"]');
      if (!root) {
        root = document.createElement('section');
        root.className = 'sm-dashboard-shell';
        root.dataset.smDashboardRoot = 'true';
        root.innerHTML = `
          <div class="sm-dashboard-topbar">
            <div>
              <p class="sm-dashboard-kicker">Home / 今日概览</p>
              <h1 class="sm-dashboard-title">我的一天</h1>
              <p class="sm-dashboard-subtitle">先看今日运营，再处理待办事项。每张卡片都可以直接进入对应管理页面。</p>
            </div>
            <div class="sm-dashboard-date"><strong>${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</strong><span>${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span></div>
          </div>
          <div class="sm-dashboard-section-head"><h2>今日数据</h2><span>了解今天的会员、咨询和课程情况</span></div>
          <div class="sm-dashboard-grid">
            <a class="sm-dashboard-card" href="/admin/content-manager/collection-types/plugin::users-permissions.user">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark">新</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">今日新增注册会员</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="members">—</p>
              <p class="sm-dashboard-card-help">点击查看会员列表</p>
            </a>
            <a class="sm-dashboard-card" href="/admin/content-manager/collection-types/plugin::users-permissions.user">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark" data-tone="green">总</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">全部注册会员</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="totalMembers">—</p>
              <p class="sm-dashboard-card-help">查看所有用户与会员等级</p>
            </a>
            <a class="sm-dashboard-card" href="/admin/content-manager/collection-types/api::inquiry.inquiry">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark" data-tone="orange">表</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">今日新提交表单</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="inquiries">—</p>
              <p class="sm-dashboard-card-help">点击查看咨询线索</p>
            </a>
            <a class="sm-dashboard-card" href="/admin/content-manager/collection-types/api::lesson-booking.lesson-booking">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark" data-tone="violet">今</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">今日已确认课程</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="lessonsToday">—</p>
              <p class="sm-dashboard-card-help">查看今天的上课安排</p>
            </a>
          </div>
          <div class="sm-dashboard-section-head"><h2>待办事项</h2><span>有数字时建议优先处理</span></div>
          <div class="sm-dashboard-grid">
            <a class="sm-dashboard-card" data-sm-dashboard-action="true" href="/admin/content-manager/collection-types/api::lesson-booking.lesson-booking">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark" data-tone="green">课</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">待确认课程</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="bookings">—</p>
              <p class="sm-dashboard-card-help">进入老师预约审核</p>
            </a>
            <a class="sm-dashboard-card" data-sm-dashboard-action="true" href="/admin/content-manager/collection-types/api::inquiry.inquiry">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark" data-tone="orange">跟</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">尚未跟进的咨询</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="unhandledInquiries">—</p>
              <p class="sm-dashboard-card-help">联系学员并更新线索状态</p>
            </a>
            <a class="sm-dashboard-card" data-sm-dashboard-action="true" href="/admin/content-manager/collection-types/api::lesson-credit.lesson-credit">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark" data-tone="violet">奖</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">待审核课时奖励</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="rewards">—</p>
              <p class="sm-dashboard-card-help">审核打卡及邀请奖励</p>
            </a>
            <a class="sm-dashboard-card" data-sm-dashboard-action="true" href="/admin/content-manager/collection-types/api::testimonial.testimonial">
              <div class="sm-dashboard-card-top"><span class="sm-dashboard-card-mark" data-tone="rose">评</span><span class="sm-dashboard-card-arrow">↗</span></div>
              <p class="sm-dashboard-card-label">待审核学员评价</p>
              <p class="sm-dashboard-card-value" data-sm-dashboard-value="testimonials">—</p>
              <p class="sm-dashboard-card-help">审核后决定是否展示</p>
            </a>
          </div>
          <div class="sm-dashboard-foot"><span data-sm-dashboard-updated>数据加载中…</span><span>常用入口：<a href="/admin/content-manager/collection-types/plugin::users-permissions.user">会员管理</a> · <a href="/admin/content-manager/collection-types/api::article.article">知识文章</a> · <a href="/admin/content-manager/collection-types/api::course.course">课程内容</a></span></div>
        `;
        main.prepend(root);
        Array.from(main.children).forEach((child) => {
          if (child !== root) (child as HTMLElement).setAttribute('data-sm-dashboard-hidden', 'true');
        });
        void refreshDashboardSummary();
      }
      if (!dashboardWindow.__smDashboardRefreshTimer) {
        dashboardWindow.__smDashboardRefreshTimer = window.setInterval(() => { void refreshDashboardSummary(); }, 60_000);
      }
    };

    const findNavigationItem = (element: HTMLElement) => element.closest('li') ?? element.closest('a, button, [role="button"]') ?? element;

    const ensureNavItemLabels = () => {
      const nav = document.querySelector('nav');
      if (!nav) return;
      nav.querySelectorAll<HTMLElement>('a[aria-label], button[aria-label]').forEach((element) => {
        const label = element.getAttribute('aria-label')?.trim();
        if (!label || element.querySelector('.sm-nav-item-label')) return;
        const name = document.createElement('span');
        name.className = 'sm-nav-item-label';
        name.textContent = label;
        element.appendChild(name);
      });
    };

    const decorateAdminSurfaces = () => {
      const main = document.querySelector<HTMLElement>('main');
      if (!main || isDashboardHome()) return;

      const isContentManager = window.location.pathname.includes('/admin/content-manager/');
      const entryForm = isContentManager
        ? Array.from(main.querySelectorAll<HTMLFormElement>('form:not([role="search"])'))
          .find((form) => form.querySelector('[role="tabpanel"]'))
        : undefined;

      main.dataset.smAdminPage = entryForm
        ? 'content-entry'
        : isContentManager
          ? 'content-list'
          : window.location.pathname.includes('/admin/content-type-builder/')
            ? 'content-builder'
            : 'standard';

      if (entryForm) {
        const isCreateEntry = window.location.pathname.endsWith('/create');
        main.dataset.smAdminEntryMode = isCreateEntry ? 'create' : 'edit';
        entryForm.classList.remove('sm-admin-form-surface');
        entryForm.classList.add('sm-admin-entry-form');

        const header = entryForm.querySelector<HTMLElement>('[data-strapi-header]')
          ?? entryForm.firstElementChild as HTMLElement | null;
        header?.classList.add('sm-admin-entry-header');
        const headerLayout = header
          ? Array.from(header.children).find((child) => child.querySelector('h1')) as HTMLElement | undefined
          : undefined;
        headerLayout?.classList.add('sm-admin-entry-header-layout');
        if (headerLayout) {
          Array.from(headerLayout.children).forEach((section) => {
            if (section.querySelector('h1')) section.classList.add('sm-admin-entry-title-row');
            if (section.querySelector('.sm-locale-version-switcher, [role="combobox"][aria-label="语言"], [role="combobox"][aria-label="Locale"]')) {
              section.classList.add('sm-admin-entry-locale-row');
            }
          });
        }

        Array.from(entryForm.children).forEach((child) => {
          if (child !== header && child.querySelector('[role="tabpanel"]')) {
            child.classList.add('sm-admin-entry-workspace');
          }
        });

        entryForm.querySelectorAll<HTMLElement>('aside[aria-labelledby="additional-information"]').forEach((aside) => {
          aside.classList.add('sm-admin-entry-aside');
          aside.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
            const actionLabel = [button.getAttribute('aria-label'), button.getAttribute('title'), button.textContent]
              .filter(Boolean)
              .join(' ');
            if (/more document actions|更多文档操作/i.test(actionLabel)) {
              button.classList.add('sm-entry-unused-action');
            }
          });
        });

        entryForm.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((tabpanel) => {
          Array.from(tabpanel.children).forEach((layoutRoot) => {
            const hasEditableField = layoutRoot.querySelector(
              'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="combobox"]',
            );
            if (!hasEditableField) return;

            const panels = Array.from(layoutRoot.children).filter((candidate) => candidate.querySelector(
              'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="combobox"]',
            ));
            (panels.length ? panels : [layoutRoot]).forEach((panel) => {
              panel.classList.add('sm-admin-entry-panel');
            });
          });
        });
      }

      if (!entryForm) delete main.dataset.smAdminEntryMode;

      main.querySelectorAll<HTMLElement>('form:not([role="search"])').forEach((form) => {
        if (form === entryForm) return;
        form.classList.add('sm-admin-form-surface');
      });
      main.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
        table.parentElement?.classList.add('sm-admin-table-shell');
      });
      main.querySelectorAll<HTMLElement>('[role="tabpanel"], [role="region"], article').forEach((surface) => {
        surface.classList.add('sm-admin-rounded-surface');
      });
    };

    const groupContentManagerNavigation = () => {
      if (!window.location.pathname.includes('/admin/content-manager/')) return;

      const contentLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="/content-manager/collection-types/"], a[href*="/content-manager/single-types/"]',
      )).filter((link) => !link.closest('.sm-content-tree'));
      const nav = contentLinks[0]?.closest<HTMLElement>('nav, aside, [aria-label]');
      if (!nav) return;
      nav.classList.add('sm-content-manager-nav');

      const trees = Array.from(document.querySelectorAll<HTMLElement>('.sm-content-tree'));
      const treesInNav = trees.filter((tree) => nav.contains(tree));
      trees.filter((tree) => !nav.contains(tree)).forEach((tree) => tree.remove());
      if (treesInNav.length > 1) treesInNav.forEach((tree) => tree.remove());
      const existingTree = treesInNav.length === 1 ? treesInNav[0] : null;
      if (existingTree) {
        const currentPath = window.location.pathname;
        let activeGroup: HTMLElement | null = null;
        existingTree.querySelectorAll<HTMLAnchorElement>('.sm-content-group-link').forEach((item) => {
          const isCurrent = currentPath === new URL(item.href, window.location.origin).pathname;
          if (isCurrent) {
            item.setAttribute('aria-current', 'page');
            activeGroup = item.closest<HTMLElement>('.sm-content-group');
          } else {
            item.removeAttribute('aria-current');
          }
        });
        if (activeGroup) {
          existingTree.querySelectorAll<HTMLElement>('.sm-content-group').forEach((groupElement) => {
            const isActive = groupElement === activeGroup;
            groupElement.querySelector<HTMLButtonElement>('.sm-content-group-button')
              ?.setAttribute('aria-expanded', isActive ? 'true' : 'false');
            const groupList = groupElement.querySelector<HTMLElement>('.sm-content-group-list');
            if (groupList) groupList.hidden = !isActive;
          });
        }
        return;
      }

      const groups = [
        {
          id: '01',
          title: '01 内容',
          open: true,
          items: [
            ['首页管理', 'api::home-page.home-page'],
            ['知识文章', 'api::article.article'],
            ['文章分类', 'api::article-category.article-category'],
            ['常见问题', 'api::faq.faq'],
            ['固定页面', 'api::static-page.static-page'],
            ['学员评价', 'api::testimonial.testimonial'],
          ],
        },
        {
          id: '02',
          title: '02 课程',
          items: [
            ['课程', 'api::course.course'],
            ['课程章节', 'api::course-module.course-module'],
            ['课时内容', 'api::lesson.lesson'],
          ],
        },
        {
          id: '03',
          title: '03 学习',
          items: [
            ['老师预约', 'api::lesson-booking.lesson-booking'],
            ['课时奖励', 'api::lesson-credit.lesson-credit'],
            ['学习进度', 'api::learning-progress.learning-progress'],
            ['Daily 7天挑战内容', 'api::daily-challenge-day.daily-challenge-day'],
            ['Daily 打卡进度', 'api::daily-progress.daily-progress'],
            ['课程加入记录', 'api::enrollment.enrollment'],
          ],
        },
        {
          id: '04',
          title: '04 会员与交易',
          items: [
            ['会员管理', 'plugin::users-permissions.user'],
            ['会员方案', 'api::membership-plan.membership-plan'],
            ['会员订阅', 'api::membership-subscription.membership-subscription'],
            ['订单', 'api::order.order'],
            ['权益记录', 'api::entitlement.entitlement'],
          ],
        },
        {
          id: '05',
          title: '05 营销',
          items: [
            ['咨询线索', 'api::inquiry.inquiry'],
            ['邮件订阅', 'api::newsletter-subscription.newsletter-subscription'],
            ['优惠活动', 'api::promotion.promotion'],
            ['优惠码', 'api::coupon.coupon'],
          ],
        },
        {
          id: '06',
          title: '06 运营',
          items: [
            ['公告', 'api::announcement.announcement'],
            ['多端 Banner', 'api::app-banner.app-banner'],
            ['客户端版本', 'api::app-version.app-version'],
            ['推荐记录', 'api::referral.referral'],
          ],
        },
        {
          id: '07',
          title: '07 设置',
          items: [['网站设置', 'api::global-setting.global-setting']],
        },
        {
          id: '99',
          title: '99 系统内部',
          items: [
            ['退款管理', 'api::refund.refund'],
            ['支付流水', 'api::payment-transaction.payment-transaction'],
            ['Webhook 日志', 'api::webhook-event.webhook-event'],
          ],
        },
      ] as const;

      const links = contentLinks.filter((link) => nav.contains(link));
      const findLink = (uid: string) => links.find((link) => link.getAttribute('href')?.includes(uid));
      const visibleGroups = groups.map((group) => ({
        ...group,
        links: group.items
          .map(([label, uid]) => ({ label, link: findLink(uid) }))
          .filter((item): item is { label: string; link: HTMLAnchorElement } => Boolean(item.link)),
      })).filter((group) => group.links.length > 0);
      if (!visibleGroups.length) return;

      const tree = document.createElement('div');
      tree.className = 'sm-content-tree';
      tree.setAttribute('aria-label', '内容管理分类');

      const currentPath = window.location.pathname;
      const activeGroupId = visibleGroups.find((group) => group.links.some(({ link }) => {
        const href = link.getAttribute('href');
        return href ? currentPath === new URL(href, window.location.origin).pathname : false;
      }))?.id;

      visibleGroups.forEach((group) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'sm-content-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sm-content-group-button';
        const shouldOpen = activeGroupId ? group.id === activeGroupId : Boolean(group.open);
        button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        const title = document.createElement('span');
        title.textContent = group.title;
        const chevron = document.createElement('span');
        chevron.className = 'sm-content-group-chevron';
        button.append(title, chevron);

        const list = document.createElement('div');
        list.className = 'sm-content-group-list';
        list.hidden = !shouldOpen;
        group.links.forEach(({ label, link }) => {
          const item = document.createElement('a');
          item.className = 'sm-content-group-link';
          item.href = link.getAttribute('href') ?? '#';
          item.textContent = label;
          if (currentPath === new URL(item.href, window.location.origin).pathname) {
            item.setAttribute('aria-current', 'page');
          }
          list.appendChild(item);
        });

        button.addEventListener('click', () => {
          const isOpen = button.getAttribute('aria-expanded') === 'true';
          tree.querySelectorAll<HTMLButtonElement>('.sm-content-group-button').forEach((otherButton) => {
            if (otherButton === button) return;
            otherButton.setAttribute('aria-expanded', 'false');
            const otherList = otherButton.parentElement?.querySelector<HTMLElement>('.sm-content-group-list');
            if (otherList) otherList.hidden = true;
          });
          button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          list.hidden = isOpen;
        });
        wrapper.append(button, list);
        tree.appendChild(wrapper);
      });

      const nativeSections = links[0]?.closest('ol')?.closest('li')?.parentElement;
      if (nativeSections && nav.contains(nativeSections)) {
        nativeSections.setAttribute('data-sm-content-native-hidden', 'true');
        nativeSections.parentElement?.insertBefore(tree, nativeSections);
      } else {
        nav.appendChild(tree);
        links.forEach((link) => (link.closest('li') ?? link).setAttribute('data-sm-content-flat-hidden', 'true'));
      }

      const searchInput = nav.querySelector<HTMLInputElement>('input[name="search_contentType"]');
      if (searchInput && searchInput.dataset.smTreeSearchBound !== 'true') {
        searchInput.dataset.smTreeSearchBound = 'true';
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.trim().toLocaleLowerCase();
          tree.querySelectorAll<HTMLElement>('.sm-content-group').forEach((groupElement) => {
            let visibleCount = 0;
            groupElement.querySelectorAll<HTMLElement>('.sm-content-group-link').forEach((item) => {
              const visible = !query || (item.textContent ?? '').toLocaleLowerCase().includes(query);
              item.hidden = !visible;
              if (visible) visibleCount += 1;
            });
            groupElement.hidden = visibleCount === 0;
            if (query && visibleCount > 0) {
              const groupButton = groupElement.querySelector<HTMLButtonElement>('.sm-content-group-button');
              const groupList = groupElement.querySelector<HTMLElement>('.sm-content-group-list');
              groupButton?.setAttribute('aria-expanded', 'true');
              if (groupList) groupList.hidden = false;
            }
          });
        });
      }
    };

    const groupContentTypeBuilderNavigation = () => {
      if (!window.location.pathname.includes('/admin/plugins/content-type-builder')) return;

      const modelLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="/plugins/content-type-builder/content-types/"]',
      )).filter((link) => !link.closest('.sm-content-tree'));
      const componentLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="/plugins/content-type-builder/component-categories/"]',
      )).filter((link) => !link.closest('.sm-content-tree'));
      const nativeLinks = [...modelLinks, ...componentLinks];
      const nav = nativeLinks[0]?.closest<HTMLElement>('nav, aside, [aria-label]');
      if (!nav) return;
      nav.classList.add('sm-content-builder-nav');

      const trees = Array.from(document.querySelectorAll<HTMLElement>('.sm-content-tree'));
      const treesInNav = trees.filter((tree) => nav.contains(tree));
      trees.filter((tree) => !nav.contains(tree) && tree.dataset.smTreeType === 'builder').forEach((tree) => tree.remove());
      if (treesInNav.length > 1) treesInNav.slice(1).forEach((tree) => tree.remove());
      const existingTree = treesInNav[0] ?? null;
      if (existingTree) {
        const currentPath = window.location.pathname;
        let activeGroup: HTMLElement | null = null;
        existingTree.querySelectorAll<HTMLAnchorElement>('.sm-content-group-link').forEach((item) => {
          const isCurrent = currentPath === new URL(item.href, window.location.origin).pathname;
          if (isCurrent) {
            item.setAttribute('aria-current', 'page');
            activeGroup = item.closest<HTMLElement>('.sm-content-group');
          } else {
            item.removeAttribute('aria-current');
          }
        });
        if (activeGroup) {
          existingTree.querySelectorAll<HTMLElement>('.sm-content-group').forEach((groupElement) => {
            const isActive = groupElement === activeGroup;
            groupElement.querySelector<HTMLButtonElement>('.sm-content-group-button')
              ?.setAttribute('aria-expanded', isActive ? 'true' : 'false');
            const groupList = groupElement.querySelector<HTMLElement>('.sm-content-group-list');
            if (groupList) groupList.hidden = !isActive;
          });
        }
        return;
      }

      const groups = [
        {
          id: '01',
          title: '01 内容模型',
          open: true,
          items: [
            ['首页管理', 'api::home-page.home-page'],
            ['知识文章', 'api::article.article'],
            ['文章分类', 'api::article-category.article-category'],
            ['常见问题', 'api::faq.faq'],
            ['固定页面', 'api::static-page.static-page'],
            ['学员评价', 'api::testimonial.testimonial'],
          ],
        },
        {
          id: '02',
          title: '02 课程模型',
          items: [
            ['课程', 'api::course.course'],
            ['课程章节', 'api::course-module.course-module'],
            ['课时内容', 'api::lesson.lesson'],
          ],
        },
        {
          id: '03',
          title: '03 学习模型',
          items: [
            ['老师预约', 'api::lesson-booking.lesson-booking'],
            ['课时奖励', 'api::lesson-credit.lesson-credit'],
            ['学习进度', 'api::learning-progress.learning-progress'],
            ['Daily 7天挑战内容', 'api::daily-challenge-day.daily-challenge-day'],
            ['Daily 打卡进度', 'api::daily-progress.daily-progress'],
            ['课程加入记录', 'api::enrollment.enrollment'],
          ],
        },
        {
          id: '04',
          title: '04 会员与交易模型',
          items: [
            ['用户', 'plugin::users-permissions.user'],
            ['会员方案', 'api::membership-plan.membership-plan'],
            ['会员订阅', 'api::membership-subscription.membership-subscription'],
            ['订单', 'api::order.order'],
            ['权益记录', 'api::entitlement.entitlement'],
          ],
        },
        {
          id: '05',
          title: '05 营销模型',
          items: [
            ['咨询线索', 'api::inquiry.inquiry'],
            ['邮件订阅', 'api::newsletter-subscription.newsletter-subscription'],
            ['优惠活动', 'api::promotion.promotion'],
            ['优惠码', 'api::coupon.coupon'],
            ['推荐记录', 'api::referral.referral'],
          ],
        },
        {
          id: '06',
          title: '06 运营模型',
          items: [
            ['公告', 'api::announcement.announcement'],
            ['多端 Banner', 'api::app-banner.app-banner'],
            ['客户端版本', 'api::app-version.app-version'],
          ],
        },
        {
          id: '07',
          title: '07 网站设置',
          items: [['网站设置', 'api::global-setting.global-setting']],
        },
        {
          id: '99',
          title: '99 系统内部',
          items: [
            ['退款管理', 'api::refund.refund'],
            ['支付流水', 'api::payment-transaction.payment-transaction'],
            ['Webhook 日志', 'api::webhook-event.webhook-event'],
          ],
        },
      ] as const;

      const links = modelLinks.filter((link) => nav.contains(link));
      const findLink = (uid: string) => links.find((link) => link.getAttribute('href')?.includes(uid));
      const visibleGroups = groups.map((group) => ({
        ...group,
        links: group.items
          .map(([label, uid]) => ({ label, link: findLink(uid) }))
          .filter((item): item is { label: string; link: HTMLAnchorElement } => Boolean(item.link)),
      })).filter((group) => group.links.length > 0);

      const reusableComponents = componentLinks
        .filter((link) => nav.contains(link))
        .map((link) => ({ label: link.textContent?.trim() || '未命名组件', link }));
      if (reusableComponents.length > 0) {
        visibleGroups.push({
          id: '08',
          title: '08 可复用组件',
          items: [],
          links: reusableComponents,
        } as (typeof visibleGroups)[number]);
      }
      visibleGroups.sort((a, b) => a.id.localeCompare(b.id, 'zh-CN', { numeric: true }));
      if (!visibleGroups.length) return;

      const tree = document.createElement('div');
      tree.className = 'sm-content-tree';
      tree.dataset.smTreeType = 'builder';
      tree.setAttribute('aria-label', '内容类型业务分类');

      const createButtons = Array.from(nav.querySelectorAll<HTMLButtonElement>('button')).filter((button) => {
        const label = button.textContent?.trim() ?? '';
        return label.includes('创建新的集合类型') || label.includes('创建新的单一类型') || label.includes('创建新组件')
          || label.includes('Create new collection type') || label.includes('Create new single type') || label.includes('Create a new component');
      });
      if (createButtons.length > 0) {
        const actions = document.createElement('div');
        actions.className = 'sm-content-builder-actions';
        const actionLabels = ['+ 集合', '+ 单一', '+ 组件'];
        createButtons.slice(0, 3).forEach((nativeButton, index) => {
          const action = document.createElement('button');
          action.type = 'button';
          action.className = 'sm-content-builder-action';
          action.textContent = actionLabels[index];
          action.addEventListener('click', () => nativeButton.click());
          actions.appendChild(action);
        });
        tree.appendChild(actions);
      }

      const currentPath = window.location.pathname;
      const activeGroupId = visibleGroups.find((group) => group.links.some(({ link }) => {
        const href = link.getAttribute('href');
        return href ? currentPath === new URL(href, window.location.origin).pathname : false;
      }))?.id;

      visibleGroups.forEach((group) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'sm-content-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sm-content-group-button';
        const shouldOpen = activeGroupId ? group.id === activeGroupId : Boolean('open' in group && group.open);
        button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        const title = document.createElement('span');
        title.textContent = group.title;
        const chevron = document.createElement('span');
        chevron.className = 'sm-content-group-chevron';
        button.append(title, chevron);

        const list = document.createElement('div');
        list.className = 'sm-content-group-list';
        list.hidden = !shouldOpen;
        group.links.forEach(({ label, link }) => {
          const item = document.createElement('a');
          item.className = 'sm-content-group-link';
          item.href = link.getAttribute('href') ?? '#';
          item.textContent = label;
          if (currentPath === new URL(item.href, window.location.origin).pathname) item.setAttribute('aria-current', 'page');
          item.addEventListener('click', (event) => {
            event.preventDefault();
            link.click();
          });
          list.appendChild(item);
        });

        button.addEventListener('click', () => {
          const isOpen = button.getAttribute('aria-expanded') === 'true';
          tree.querySelectorAll<HTMLButtonElement>('.sm-content-group-button').forEach((otherButton) => {
            if (otherButton === button) return;
            otherButton.setAttribute('aria-expanded', 'false');
            const otherList = otherButton.parentElement?.querySelector<HTMLElement>('.sm-content-group-list');
            if (otherList) otherList.hidden = true;
          });
          button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          list.hidden = isOpen;
        });
        wrapper.append(button, list);
        tree.appendChild(wrapper);
      });

      const nativeSections = links[0]?.closest('ol')?.closest('li')?.parentElement;
      if (nativeSections && nav.contains(nativeSections)) {
        nativeSections.setAttribute('data-sm-content-native-hidden', 'true');
        nativeSections.parentElement?.insertBefore(tree, nativeSections);
      } else {
        nav.appendChild(tree);
        nativeLinks.forEach((link) => (link.closest('li') ?? link).setAttribute('data-sm-content-flat-hidden', 'true'));
      }

      const searchInput = nav.querySelector<HTMLInputElement>('input[name="search_contentType"]');
      if (searchInput && searchInput.dataset.smBuilderTreeSearchBound !== 'true') {
        searchInput.dataset.smBuilderTreeSearchBound = 'true';
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.trim().toLocaleLowerCase();
          tree.querySelectorAll<HTMLElement>('.sm-content-group').forEach((groupElement) => {
            let visibleCount = 0;
            groupElement.querySelectorAll<HTMLElement>('.sm-content-group-link').forEach((item) => {
              const visible = !query || (item.textContent ?? '').toLocaleLowerCase().includes(query);
              item.hidden = !visible;
              if (visible) visibleCount += 1;
            });
            groupElement.hidden = visibleCount === 0;
            if (query && visibleCount > 0) {
              const groupButton = groupElement.querySelector<HTMLButtonElement>('.sm-content-group-button');
              const groupList = groupElement.querySelector<HTMLElement>('.sm-content-group-list');
              groupButton?.setAttribute('aria-expanded', 'true');
              if (groupList) groupList.hidden = false;
            }
          });
        });
      }
    };

    const adminRequestHeaders = () => {
      const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
      const storedToken = window.localStorage.getItem('jwtToken');
      if (!storedToken) return headers;
      let token = storedToken;
      try {
        const parsed = JSON.parse(storedToken);
        if (typeof parsed === 'string') token = parsed;
      } catch {
        token = storedToken.replace(/^"|"$/g, '');
      }
      if (token) headers.Authorization = `Bearer ${token}`;
      return headers;
    };

    const userEntryDetails = () => {
      const match = window.location.pathname.match(
        /\/admin\/content-manager\/collection-types\/plugin::users-permissions\.user\/([^/]+)/,
      );
      if (!match || match[1] === 'create') return null;
      const main = document.querySelector<HTMLElement>('main');
      const emailInput = main?.querySelector<HTMLInputElement>('input[name="email"]');
      if (!main || !emailInput?.value.trim()) return null;
      return {
        main,
        userId: decodeURIComponent(match[1]),
        email: emailInput.value.trim(),
        name: main.querySelector<HTMLInputElement>('input[name="fullName"]')?.value.trim()
          || main.querySelector<HTMLInputElement>('input[name="displayName"]')?.value.trim()
          || emailInput.value.trim(),
      };
    };

    const removeContactUserDialog = () => {
      document.querySelectorAll('.sm-contact-user-overlay').forEach((overlay) => overlay.remove());
    };

    const openContactUserDialog = (details: { userId: string; email: string; name: string }) => {
      removeContactUserDialog();
      const overlay = document.createElement('div');
      overlay.className = 'sm-contact-user-overlay';
      const dialog = document.createElement('div');
      dialog.className = 'sm-contact-user-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const heading = document.createElement('h2');
      heading.textContent = '联系用户 / Contact user';
      const description = document.createElement('p');
      description.textContent = `收件人：${details.name} · ${details.email}。邮件将使用 SureMandarin 官方邮箱发送。`;
      const subjectLabel = document.createElement('label');
      subjectLabel.textContent = '邮件主题 / Subject';
      const subject = document.createElement('input');
      subject.type = 'text';
      subject.maxLength = 160;
      subject.value = '关于你的中文学习计划 / Your Chinese learning plan';
      subjectLabel.appendChild(subject);
      const messageLabel = document.createElement('label');
      messageLabel.textContent = '邮件内容 / Message';
      const message = document.createElement('textarea');
      message.maxLength = 12000;
      message.placeholder = '请输入要发送给用户的内容…';
      message.value = `Hi ${details.name},\n\nThank you for joining SureMandarin. I would love to learn more about your Chinese learning goals and help you choose the right plan.\n\nBest regards,\nSureMandarin`;
      messageLabel.appendChild(message);

      const status = document.createElement('p');
      status.className = 'sm-contact-user-status';
      status.setAttribute('role', 'status');
      const actions = document.createElement('div');
      actions.className = 'sm-contact-user-dialog-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'sm-contact-user-cancel';
      cancel.textContent = '取消 / Cancel';
      const send = document.createElement('button');
      send.type = 'button';
      send.className = 'sm-contact-user-send';
      send.textContent = '发送邮件 / Send email';
      actions.append(cancel, send);
      dialog.append(heading, description, subjectLabel, messageLabel, status, actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      subject.focus();

      const close = () => overlay.remove();
      cancel.addEventListener('click', close);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
      });
      dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      });
      send.addEventListener('click', async () => {
        const subjectValue = subject.value.trim();
        const messageValue = message.value.trim();
        if (!subjectValue || !messageValue) {
          status.dataset.error = 'true';
          status.textContent = '请填写邮件主题和内容。';
          return;
        }
        send.disabled = true;
        cancel.disabled = true;
        status.dataset.error = 'false';
        status.textContent = '正在发送…';
        try {
          const { data: payload } = await getFetchClient().post<{
            data?: { message?: string };
          }>('/suremandarin/contact-user', {
            userId: details.userId,
            subject: subjectValue,
            message: messageValue,
          });
          status.dataset.error = 'false';
          status.textContent = payload.data?.message || '邮件已发送。';
          window.setTimeout(close, 900);
        } catch (error) {
          status.dataset.error = 'true';
          status.textContent = error instanceof Error ? error.message : '邮件发送失败，请稍后重试。';
          send.disabled = false;
          cancel.disabled = false;
        }
      });
    };

    const enhanceUserContactAction = () => {
      const details = userEntryDetails();
      const existing = document.querySelector<HTMLElement>('.sm-contact-user-card');
      if (!details) {
        existing?.remove();
        removeContactUserDialog();
        return;
      }
      if (existing) {
        const emailLabel = existing.querySelector<HTMLElement>('[data-sm-contact-email]');
        if (emailLabel) emailLabel.textContent = details.email;
        return;
      }

      const card = document.createElement('section');
      card.className = 'sm-contact-user-card';
      const copy = document.createElement('div');
      copy.className = 'sm-contact-user-copy';
      const title = document.createElement('strong');
      title.textContent = '联系用户';
      const email = document.createElement('span');
      email.dataset.smContactEmail = 'true';
      email.textContent = details.email;
      copy.append(title, email);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sm-contact-user-button';
      button.textContent = '联系用户 / Contact user';
      button.addEventListener('click', () => openContactUserDialog(details));
      card.append(copy, button);
      details.main.prepend(card);
    };

    const translationRouteDetails = () => {
      const match = window.location.pathname.match(
        /\/admin\/content-manager\/(?:collection-types|single-types)\/([^/]+)(?:\/([^/]+))?/,
      );
      if (!match) return null;
      const uid = decodeURIComponent(match[1]);
      const routeId = match[2] ? decodeURIComponent(match[2]) : '';
      return { uid, documentId: routeId && routeId !== 'create' ? routeId : '' };
    };

    const syncAutoTranslateAction = (
      switcher: HTMLElement,
      locale: string,
      isNewLocalizedEntry: boolean,
    ) => {
      let button = switcher.querySelector<HTMLButtonElement>('.sm-auto-translate-button');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'sm-auto-translate-button';
        button.addEventListener('click', async () => {
          if (button?.dataset.loading === 'true') return;
          const route = translationRouteDetails();
          if (!route) {
            window.alert('无法识别当前内容，请刷新页面后重试。');
            return;
          }
          const runTranslation = async (force: boolean) => fetch('/admin/suremandarin/translate-english-draft', {
            method: 'POST',
            credentials: 'same-origin',
            headers: adminRequestHeaders(),
            body: JSON.stringify({ uid: route.uid, documentId: route.documentId, force }),
          });

          button.dataset.loading = 'true';
          button.disabled = true;
          button.textContent = '正在生成英文草稿…';
          try {
            let response = await runTranslation(false);
            let payload = await response.json().catch(() => ({})) as {
              data?: { message?: string };
              error?: { code?: string; message?: string };
            };
            if (response.status === 409 && payload.error?.code === 'ENGLISH_DRAFT_EXISTS') {
              const confirmed = window.confirm(
                '英文草稿已经有内容。重新翻译会覆盖英文草稿中的人工修改，但不会影响已发布版本。是否继续？',
              );
              if (!confirmed) return;
              response = await runTranslation(true);
              payload = await response.json().catch(() => ({}));
            }
            if (!response.ok) throw new Error(payload.error?.message || '生成英文草稿失败，请稍后重试。');
            window.alert(payload.data?.message || '英文草稿已生成，请校对后再发布。');
            const targetUrl = new URL(window.location.href);
            targetUrl.searchParams.set('plugins[i18n][locale]', 'en');
            window.location.assign(targetUrl.toString());
          } catch (error) {
            window.alert(error instanceof Error ? error.message : '生成英文草稿失败，请稍后重试。');
          } finally {
            if (button) {
              delete button.dataset.loading;
              button.disabled = false;
              button.textContent = '生成英文草稿';
            }
          }
        });
        switcher.appendChild(button);
      }

      const shouldHide = locale !== 'zh';
      if (button.hidden !== shouldHide) button.hidden = shouldHide;
      if (button.dataset.loading === 'true') return;
      if (button.disabled !== isNewLocalizedEntry) button.disabled = isNewLocalizedEntry;
      const expectedText = isNewLocalizedEntry ? '保存中文后再翻译' : '生成英文草稿';
      if (button.textContent !== expectedText) button.textContent = expectedText;
      const expectedTitle = isNewLocalizedEntry
        ? '请先保存当前中文内容'
        : '使用已保存的中文内容生成英文草稿，人工校对后再发布';
      if (button.title !== expectedTitle) button.title = expectedTitle;
    };

    const enhanceContentLocaleSwitcher = () => {
      const path = window.location.pathname;
      const bilingualContentTypes = [
        'api::announcement.announcement',
        'api::app-banner.app-banner',
        'api::article.article',
        'api::course-module.course-module',
        'api::course.course',
        'api::faq.faq',
        'api::global-setting.global-setting',
        'api::home-page.home-page',
        'api::lesson.lesson',
        'api::membership-plan.membership-plan',
        'api::promotion.promotion',
        'api::static-page.static-page',
        'api::testimonial.testimonial',
      ];
      const supportedPage = bilingualContentTypes.some((uid) => path.includes(uid));
      if (!supportedPage || !path.includes('/admin/content-manager/')) return;
      const main = document.querySelector<HTMLElement>('main');
      const localeControl = main?.querySelector<HTMLElement>(
        '[role="combobox"][aria-label="语言"], [role="combobox"][aria-label="Locale"]',
      );
      if (!main) return;

      const nativeLocaleControls = localeControl?.parentElement;
      nativeLocaleControls?.classList.add('sm-native-locale-controls');
      const nativeLocaleWrapper = nativeLocaleControls?.parentElement;
      nativeLocaleWrapper?.classList.add('sm-native-locale-wrapper');

      const locale = new URL(window.location.href).searchParams.get('plugins[i18n][locale]') || 'en';
      const isNewLocalizedEntry = path.endsWith('/create');
      const existing = main.querySelector<HTMLElement>('.sm-locale-version-switcher');
      if (existing) {
        // The locale control can mount after the entry header. Move the shared
        // switcher beside it once available, then remove the temporary fallback
        // row. This keeps Super Admin, Editor and Author on one identical UI.
        if (nativeLocaleWrapper?.parentElement) {
          const nativeLocaleRow = nativeLocaleWrapper.parentElement;
          if (existing.parentElement !== nativeLocaleRow || nativeLocaleWrapper.nextElementSibling !== existing) {
            nativeLocaleRow.insertBefore(existing, nativeLocaleWrapper.nextSibling);
          }
          main.querySelectorAll<HTMLElement>('.sm-role-independent-locale-row').forEach((row) => {
            if (!row.contains(existing)) row.remove();
          });
        }
        const existingLabel = existing.querySelector<HTMLElement>('.sm-locale-version-label');
        const expectedLabel = isNewLocalizedEntry
          ? '双语内容：先保存当前语言，再创建并填写另一语言版本。'
          : '双语内容：中文与英文版本需要分别保存并发布。';
        if (existingLabel && existingLabel.textContent !== expectedLabel) existingLabel.textContent = expectedLabel;
        existing.querySelectorAll<HTMLButtonElement>('.sm-locale-version-button').forEach((button) => {
          button.dataset.active = button.dataset.locale === locale ? 'true' : 'false';
        });
        syncAutoTranslateAction(existing, locale, isNewLocalizedEntry);
        return;
      }

      const switcher = document.createElement('div');
      switcher.className = 'sm-locale-version-switcher';
      const label = document.createElement('span');
      label.className = 'sm-locale-version-label';
      label.textContent = isNewLocalizedEntry
        ? '双语内容：先保存当前语言，再创建并填写另一语言版本。'
        : '双语内容：中文与英文版本需要分别保存并发布。';
      switcher.appendChild(label);

      ([['en', 'English Version'], ['zh', '中文版本']] as const).forEach(([code, text]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sm-locale-version-button';
        button.dataset.locale = code;
        button.dataset.active = locale === code ? 'true' : 'false';
        button.textContent = text;
        button.disabled = isNewLocalizedEntry && code !== locale;
        if (button.disabled) button.title = '请先保存当前语言版本，再创建对应翻译。';
        button.addEventListener('click', () => {
          if (code === locale) return;
          const url = new URL(window.location.href);
          url.searchParams.set('plugins[i18n][locale]', code);
          window.location.assign(url.toString());
        });
        switcher.appendChild(button);
      });
      syncAutoTranslateAction(switcher, locale, isNewLocalizedEntry);

      if (nativeLocaleWrapper?.parentElement) {
        nativeLocaleWrapper.parentElement.insertBefore(switcher, nativeLocaleWrapper.nextSibling);
      } else {
        const entryForm = Array.from(main.querySelectorAll<HTMLFormElement>('form:not([role="search"])'))
          .find((form) => form.querySelector('[role="tabpanel"]'));
        const header = entryForm?.firstElementChild as HTMLElement | null;
        const headerLayout = header
          ? Array.from(header.children).find((child) => child.querySelector('h1')) as HTMLElement | undefined
          : undefined;
        headerLayout?.classList.add('sm-admin-entry-header-layout');
        let localeRow = headerLayout?.querySelector<HTMLElement>('.sm-admin-entry-locale-row');
        if (!localeRow && headerLayout) {
          localeRow = document.createElement('div');
          localeRow.className = 'sm-admin-entry-locale-row sm-role-independent-locale-row';
          headerLayout.appendChild(localeRow);
        }
        localeRow?.appendChild(switcher);
      }
    };

    const markNavigation = () => {
      const nav = document.querySelector('nav');
      if (!nav) return;

      const nativeLogo = nav.querySelector<HTMLImageElement>(
        'img[alt="Application logo"], img[alt="应用程序徽标"], img[alt*="logo" i]',
      );
      const nativeBrandRow = nativeLogo?.parentElement?.parentElement?.parentElement
        ?? nativeLogo?.parentElement?.parentElement;
      nativeBrandRow?.classList.add('sm-native-brand-row');

      if (!nav.querySelector('.sm-nav-brand')) {
        const brand = document.createElement('div');
        brand.className = 'sm-nav-brand';
        const image = document.createElement('img');
        image.src = MenuLogo;
        image.alt = 'SureMandarin';
        const name = document.createElement('span');
        name.textContent = 'SureMandarin';
        brand.append(image, name);
        nav.prepend(brand);
      }

      const systemLabelElements = document.querySelectorAll<HTMLElement>(
        'nav a, nav button, nav [role="button"], nav li, main h1, main h2, main h3, main h4, main [role="tab"], main button, main a',
      );
      systemLabelElements.forEach((element) => {
        const label = (element.getAttribute('aria-label') || element.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        const item = element.closest('nav') ? findNavigationItem(element) : element;
        if (/^(collection types|single types|集合类型|单一类型)$/.test(label)) {
          item.setAttribute('data-sm-system-hidden', 'true');
        }
        if (/^(deploy|depoly|deployment|部署|部署应用)$/.test(label)) {
          item.setAttribute('data-sm-deploy-item', 'true');
        }
        if (/^(03 学习 · 课程加入记录|03 学习 · 学习进度|04 会员与交易 · 权益记录|99 系统内部 · )/.test(label)) {
          item.setAttribute('data-sm-admin-only-item', 'true');
        }
      });
      ensureNavItemLabels();
    };

    const markPrimaryActions = () => {
      const labels = document.querySelectorAll<HTMLElement>('button, a, [role="button"], [role="tab"], [role="status"]');
      labels.forEach((element) => {
        const label = (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const isNew = /^(new entry|add new|create|新增|新建|创建)/i.test(label);
        const isPublish = /^(publish|发表|发布)/i.test(label);
        const isPublished = /^(published|已发布)$/i.test(label);
        if (isNew) element.classList.add('sm-new-primary');
        if (isPublish) element.classList.add('sm-publish-primary');
        if (isPublished) {
          element.classList.add('sm-published-status');
          const isDisabled = element.hasAttribute('disabled')
            || element.getAttribute('aria-disabled') === 'true'
            || element.getAttribute('data-disabled') === 'true';
          const isInteractive = element.matches('button, a, [role="button"], [role="tab"], [aria-selected]');
          if (!isDisabled && isInteractive) element.classList.add('sm-published-available');
        }
      });
    };

    const markArticleBilingualNotice = () => {
      const isContentCreatePage = window.location.pathname.includes('/admin/content-manager/')
        && window.location.pathname.endsWith('/create');
      const isArticleCreatePage = window.location.pathname.includes('/content-manager/collection-types/api::article.article/create');
      document.querySelectorAll('.sm-article-bilingual-notice').forEach((notice) => {
        if (!isArticleCreatePage) notice.remove();
      });
      if (!isContentCreatePage) return;

      const heading = Array.from(document.querySelectorAll<HTMLElement>('main h1, main h2'))
        .find((element) => /create an entry|发表内容|新建内容/i.test(element.textContent?.replace(/\s+/g, ' ').trim() ?? ''));
      if (!heading) return;

      const headingText = Array.from(heading.childNodes)
        .find((node) => node.nodeType === Node.TEXT_NODE && /create an entry/i.test(node.textContent ?? ''));
      if (headingText) headingText.textContent = '发表内容';

      if (!isArticleCreatePage || document.querySelector('.sm-article-bilingual-notice')) return;

      const notice = document.createElement('span');
      notice.className = 'sm-article-bilingual-notice';
      notice.textContent = '发表内容需发表中英文双语';
      heading.appendChild(notice);
    };

    const syncArticleCategoryField = () => {
      const categoryInputs = document.querySelectorAll<HTMLInputElement>(
        'main input[name="category"], main input[name$=".category"], main input[name="category.connect"]',
      );
      categoryInputs.forEach((input) => {
        const combobox = input.matches('[role="combobox"]')
          ? input.parentElement?.parentElement ?? input.parentElement
          : input.closest<HTMLElement>('[role="combobox"]')
            ?? input.parentElement?.parentElement
            ?? input.parentElement;
        if (!combobox) return;

        combobox.dataset.smCategoryCombobox = 'true';
        let selected = combobox.querySelector<HTMLElement>('.sm-category-selected');
        if (!selected) {
          selected = document.createElement('span');
          selected.className = 'sm-category-selected';
          selected.setAttribute('aria-hidden', 'true');
          combobox.appendChild(selected);
        }

        // The selected relation list is rendered as a sibling of the combobox.
        // Walk up to the smallest wrapper that contains both the input and list.
        let field: HTMLElement | null = combobox.parentElement;
        while (field && field !== document.body && !field.querySelector('ol')) {
          field = field.parentElement;
        }
        field?.setAttribute('data-sm-category-field', 'true');

        const relationList = field?.querySelector<HTMLOListElement>('ol');
        relationList?.setAttribute('data-sm-category-list', 'true');
        let relationListContainer = relationList?.parentElement ?? null;
        while (relationListContainer && relationListContainer.parentElement !== field) {
          relationListContainer = relationListContainer.parentElement;
        }
        relationListContainer?.setAttribute('data-sm-category-list-container', 'true');

        if (window.location.pathname.includes('api::article.article')) {
          const findGridItem = (element: HTMLElement | null) => {
            let current = element?.parentElement ?? null;
            while (current && current.tagName !== 'MAIN') {
              const parentDisplay = current.parentElement ? getComputedStyle(current.parentElement).display : '';
              if (parentDisplay === 'grid' && getComputedStyle(current).gridColumn.includes('span')) return current;
              current = current.parentElement;
            }
            return null;
          };
          const categoryGridItem = findGridItem(input);
          const titleInput = document.querySelector<HTMLInputElement>('main input[name="title"]');
          const titleGridItem = findGridItem(titleInput);
          if (categoryGridItem && titleGridItem && categoryGridItem.parentElement === titleGridItem.parentElement) {
            categoryGridItem.classList.add('sm-article-category-item');
            titleGridItem.classList.add('sm-article-title-item');
            categoryGridItem.parentElement.classList.add('sm-article-primary-row');
          }
        }

        const relationLink = relationList?.querySelector<HTMLElement>('li button, li a, li [role="link"]');
        const relationLabel = relationLink?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        // Avoid replacing the text node on every MutationObserver pass; doing
        // so creates another childList mutation and can lock up the browser.
        if (selected.textContent !== relationLabel) selected.textContent = relationLabel;
        combobox.dataset.smCategoryHasValue = relationLabel ? 'true' : 'false';
      });
    };

    const enhanceBlocksToolbar = () => {
      document.querySelectorAll<HTMLElement>('main [role="toolbar"]').forEach((toolbar) => {
        const blockSelector = toolbar.querySelector<HTMLElement>('[role="combobox"]');
        const selectorLabel = blockSelector?.getAttribute('aria-label')?.toLowerCase() ?? '';
        if (!blockSelector
          || (!selectorLabel.includes('block') && !selectorLabel.includes('内容块'))
          || toolbar.querySelector('.sm-blocks-quick-actions')) return;

        const actionGroup = document.createElement('div');
        actionGroup.className = 'sm-blocks-quick-actions';

        const dispatchPointer = (element: HTMLElement, type: string) => {
          const EventConstructor = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent;
          element.dispatchEvent(new EventConstructor(type, {
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: type === 'pointerdown' || type === 'mousedown' ? 1 : 0,
            ...(EventConstructor === window.PointerEvent ? { pointerType: 'mouse', isPrimary: true } : {}),
          } as PointerEventInit & MouseEventInit));
        };

        const chooseBlock = (labels: string[], attempt = 0) => {
          if (attempt === 0) {
            blockSelector.focus();
            dispatchPointer(blockSelector, typeof window.PointerEvent === 'function' ? 'pointerdown' : 'mousedown');
          }
          window.setTimeout(() => {
            const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
            const option = options.find((item) => {
              const text = item.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
              return labels.some((label) => text === label.toLowerCase() || text.includes(label.toLowerCase()));
            });
            if (option) {
              dispatchPointer(option, typeof window.PointerEvent === 'function' ? 'pointermove' : 'mousemove');
              dispatchPointer(option, typeof window.PointerEvent === 'function' ? 'pointerdown' : 'mousedown');
              dispatchPointer(option, typeof window.PointerEvent === 'function' ? 'pointerup' : 'mouseup');
              option.click();
              return;
            }
            if (attempt < 20) {
              chooseBlock(labels, attempt + 1);
              return;
            }
            window.alert('请先点击正文编辑区域，再点击该功能 / Please focus the article body first.');
          }, 50);
        };

        const actions = [
          { label: '图片', title: '添加图片 / Add image', targets: ['图片', 'image'] },
          { label: '视频', title: '添加视频链接 / Add video URL', targets: ['视频', 'video'] },
          { label: '居中', title: '居中段落 / Center paragraph', targets: ['居中段落', 'centered'] },
        ];

        actions.forEach((action) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'sm-blocks-quick-action';
          button.textContent = action.label;
          button.title = action.title;
          button.addEventListener('click', () => {
            if (action.label === '视频') {
              const url = window.prompt('请输入 YouTube、Vimeo、MP4 或 WebM 视频链接');
              if (!url?.trim()) return;
              (window as typeof window & { __smPendingVideoUrl?: string }).__smPendingVideoUrl = url.trim();
            }
            chooseBlock(action.targets);
          });
          actionGroup.appendChild(button);
        });

        toolbar.appendChild(actionGroup);
      });
    };

    const resolveAdminRole = async () => {
      try {
        const response = await fetch('/admin/users/me');
        if (!response.ok) return;
        const payload = await response.json() as { data?: { roles?: Array<{ code?: string }>; role?: { code?: string } } };
        const roles = payload.data?.roles ?? (payload.data?.role ? [payload.data.role] : []);
        const isSuperAdmin = roles.some((role) => role.code === 'strapi-super-admin');
        document.documentElement.dataset.smSuperAdmin = isSuperAdmin ? 'true' : 'false';
      } catch {
        document.documentElement.dataset.smSuperAdmin = 'false';
      }
    };

    markNavigation();
    decorateAdminSurfaces();
    groupContentManagerNavigation();
    groupContentTypeBuilderNavigation();
    enhanceContentLocaleSwitcher();
    markPrimaryActions();
    markArticleBilingualNotice();
    syncArticleCategoryField();
    enhanceBlocksToolbar();
    enhanceUserContactAction();
    injectDashboardHome();
    void resolveAdminRole();
    const actionObserver = new MutationObserver(() => {
      markNavigation();
      decorateAdminSurfaces();
      groupContentManagerNavigation();
      groupContentTypeBuilderNavigation();
      enhanceContentLocaleSwitcher();
      markPrimaryActions();
      markArticleBilingualNotice();
      syncArticleCategoryField();
      enhanceBlocksToolbar();
      enhanceUserContactAction();
      injectDashboardHome();
    });
    actionObserver.observe(document.body, { childList: true, subtree: true });
  },
};
