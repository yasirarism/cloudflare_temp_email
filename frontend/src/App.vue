<script setup>
import { darkTheme, NGlobalStyle, zhCN } from 'naive-ui'
import { computed, onMounted } from 'vue'
import { useScript } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useGlobalState } from './store'
import { useIsMobile } from './utils/composables'
import Header from './views/Header.vue';
import Footer from './views/Footer.vue';
import { api } from './api'

const {
  isDark, loading, useSideMargin, telegramApp, isTelegram
} = useGlobalState()
const adClient = import.meta.env.VITE_GOOGLE_AD_CLIENT;
const adSlot = import.meta.env.VITE_GOOGLE_AD_SLOT;
const { locale } = useI18n({});
const theme = computed(() => isDark.value ? darkTheme : null)
const localeConfig = computed(() => locale.value == 'zh' ? zhCN : null)
const isMobile = useIsMobile()
const showSideMargin = computed(() => !isMobile.value && useSideMargin.value);
const showAd = computed(() => !isMobile.value && adClient && adSlot);
const gridMaxCols = computed(() => showAd.value ? 8 : 12);

// Load Google Ad script at top level (not inside onMounted)
if (showAd.value) {
  useScript({
    src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`,
    async: true,
    crossorigin: "anonymous",
  })
}

onMounted(async () => {
  document.body.classList.add('glass-theme');
  try {
    await api.getUserSettings();
  } catch (error) {
    console.error(error);
  }

  const token = import.meta.env.VITE_CF_WEB_ANALY_TOKEN;

  const exist = document.querySelector('script[src="https://static.cloudflareinsights.com/beacon.min.js"]') !== null
  if (token && !exist) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = `{ token: ${token} }`;
    document.body.appendChild(script);
  }

  // check if google ad is enabled
  if (showAd.value) {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }


  // check if telegram is enabled
  const enableTelegram = import.meta.env.VITE_IS_TELEGRAM;
  if (
    (typeof enableTelegram === 'boolean' && enableTelegram === true)
    ||
    (typeof enableTelegram === 'string' && enableTelegram === 'true')
  ) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    telegramApp.value = window.Telegram?.WebApp || {};
    isTelegram.value = !!window.Telegram?.WebApp?.initData;
  }
});
</script>

<template>
  <n-config-provider :locale="localeConfig" :theme="theme">
    <n-global-style />
    <n-spin description="loading..." :show="loading">
      <n-notification-provider container-style="margin-top: 60px;">
        <n-message-provider container-style="margin-top: 20px;">
          <n-grid x-gap="12" :cols="gridMaxCols">
            <n-gi v-if="showSideMargin" span="1">
              <div class="side" v-if="showAd">
                <ins class="adsbygoogle" style="display:block" :data-ad-client="adClient" :data-ad-slot="adSlot"
                  data-ad-format="auto" data-full-width-responsive="true"></ins>
              </div>
            </n-gi>
            <n-gi :span="!showSideMargin ? gridMaxCols : (gridMaxCols - 2)">
              <div class="main glass-shell">
                <n-space vertical>
                  <n-layout class="glass-surface" style="min-height: 80vh;">
                    <Header />
                    <router-view></router-view>
                  </n-layout>
                  <Footer />
                </n-space>
              </div>
            </n-gi>
            <n-gi v-if="showSideMargin" span="1">
              <div class="side" v-if="showAd">
                <ins class="adsbygoogle" style="display:block" :data-ad-client="adClient" :data-ad-slot="adSlot"
                  data-ad-format="auto" data-full-width-responsive="true"></ins>
              </div>
            </n-gi>
          </n-grid>
          <n-back-top />
        </n-message-provider>
      </n-notification-provider>
    </n-spin>
  </n-config-provider>
</template>


<style>
:root {
  --glass-bg: rgba(255, 255, 255, 0.28);
  --glass-border: rgba(255, 255, 255, 0.45);
  --glass-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  --glass-selection-bg: rgba(255, 255, 255, 0.25);
  --glass-backdrop-blur: 18px;
  --glass-button-bg: rgba(255, 255, 255, 0.35);
  --glass-button-border: rgba(255, 255, 255, 0.55);
  --app-bg-start: #e0f2fe;
  --app-bg-end: #f1f5f9;
}

.dark {
  --glass-bg: rgba(15, 23, 42, 0.6);
  --glass-border: rgba(148, 163, 184, 0.25);
  --glass-shadow: 0 18px 40px rgba(2, 6, 23, 0.45);
  --glass-selection-bg: rgba(30, 41, 59, 0.55);
  --glass-button-bg: rgba(30, 41, 59, 0.7);
  --glass-button-border: rgba(148, 163, 184, 0.25);
  --app-bg-start: #0f172a;
  --app-bg-end: #111827;
}

body {
  margin: 0;
  background: radial-gradient(circle at top, var(--app-bg-start), transparent 55%),
    radial-gradient(circle at bottom, rgba(125, 211, 252, 0.45), transparent 60%),
    linear-gradient(135deg, var(--app-bg-start), var(--app-bg-end));
  background-attachment: fixed;
}

html,
body,
#app {
  height: 100%;
}

.glass-shell {
  padding: 0;
}

.glass-surface,
.glass-shell .n-card,
.glass-shell .n-tabs-nav,
.glass-shell .n-list,
.glass-shell .n-split,
.glass-shell .n-split-pane,
.glass-shell .n-drawer-content,
.glass-shell .n-menu,
.glass-theme .n-modal-body-wrapper,
.glass-theme .n-modal-body,
.glass-theme .n-drawer-content,
.glass-theme .n-modal,
.glass-theme .n-dropdown-menu,
.glass-theme .n-select-menu,
.glass-theme .n-popover,
.glass-theme .n-popconfirm,
.glass-theme .n-message,
.glass-theme .n-notification,
.glass-theme .n-dialog,
.glass-theme .n-base-selection {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-backdrop-blur));
  -webkit-backdrop-filter: blur(var(--glass-backdrop-blur));
}

.glass-shell .n-button,
.glass-theme .n-button {
  background: var(--glass-button-bg) !important;
  border: 1px solid var(--glass-button-border) !important;
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-backdrop-blur));
  -webkit-backdrop-filter: blur(var(--glass-backdrop-blur));
}

.glass-theme .n-menu-item-content,
.glass-theme .n-dropdown-option,
.glass-theme .n-select-option,
.glass-theme .n-base-selection-label {
  background: transparent;
  color: inherit;
}

.glass-theme .n-menu-item-content--selected,
.glass-theme .n-dropdown-option-body:hover,
.glass-theme .n-select-option-body:hover {
  background: var(--glass-selection-bg);
}

.glass-theme .n-message__content,
.glass-theme .n-notification-main,
.glass-theme .n-dialog__content {
  color: inherit;
}

.glass-theme .n-switch__rail {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-theme .n-switch__button {
  background: var(--glass-button-bg);
  border: 1px solid var(--glass-button-border);
}

.glass-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-backdrop-blur));
  -webkit-backdrop-filter: blur(var(--glass-backdrop-blur));
  color: inherit;
}

.n-switch {
  margin-left: 10px;
  margin-right: 10px;
}
</style>

<style scoped>
.side {
  height: 100vh;
}

.main {
  height: 100vh;
  text-align: center;
  padding: 0;
}

.n-grid {
  height: 100%;
}

.n-gi {
  height: 100%;
}

.n-space {
  height: 100%;
}
</style>
