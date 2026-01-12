<script setup>
import { ref, h, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useIsMobile } from '../utils/composables'
import {
    DarkModeFilled, LightModeFilled, MenuFilled,
    AdminPanelSettingsFilled
} from '@vicons/material'
import { GithubAlt, Language, User, Home } from '@vicons/fa'

import { useGlobalState } from '../store'
import { api } from '../api'
import { getRouterPathWithLang } from '../utils'

const message = useMessage()
const notification = useNotification()

const {
    toggleDark, isDark, isTelegram, showAdminPage,
    showAuth, auth, loading, openSettings, userSettings
} = useGlobalState()
const route = useRoute()
const router = useRouter()
const isMobile = useIsMobile()

const showMobileMenu = ref(false)
const menuValue = computed(() => {
    if (route.path.includes("user")) return "user";
    if (route.path.includes("admin")) return "admin";
    return "home";
});

const authFunc = async () => {
    try {
        location.reload()
    } catch (error) {
        message.error(error.message || "error");
    }
}

const stripLangPrefix = (path) => {
    const normalized = path.replace(/^\/(en|id)(?=\/|$)/, '');
    return normalized || '/';
}

const changeLocale = async (lang) => {
    const normalizedPath = stripLangPrefix(route.fullPath);
    localStorage.setItem('locale', lang);
    await router.push(getRouterPathWithLang(normalizedPath, lang));
}

const { locale, t } = useI18n({
    messages: {
        en: {
            title: 'Cloudflare Temp Email',
            dark: 'Dark',
            light: 'Light',
            accessHeader: 'Access Password',
            accessTip: 'Please enter the correct access password',
            home: 'Home',
            menu: 'Menu',
            user: 'User',
            ok: 'OK',
            greetingMorning: 'Good morning',
            greetingAfternoon: 'Good afternoon',
            greetingEvening: 'Good evening',
        },
        id: {
            title: 'Cloudflare Email Sementara',
            dark: 'Gelap',
            light: 'Terang',
            accessHeader: 'Kata Sandi Akses',
            accessTip: 'Masukkan kata sandi akses yang benar',
            home: 'Beranda',
            menu: 'Menu',
            user: 'Pengguna',
            ok: 'OK',
            greetingMorning: 'Selamat pagi',
            greetingAfternoon: 'Selamat siang',
            greetingEvening: 'Selamat malam',
        }
    }
});

const version = import.meta.env.PACKAGE_VERSION ? `v${import.meta.env.PACKAGE_VERSION}` : "";

const menuOptions = computed(() => [
    {
        label: () => h(NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "home" ? "primary" : "default",
                class: "nav-button",
                style: "width: 100%",
                onClick: async () => {
                    await router.push(getRouterPathWithLang('/', locale.value));
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => t('home'),
                icon: () => h(NIcon, { component: Home })
            }),
        key: "home"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "user" ? "primary" : "default",
                class: "nav-button",
                style: "width: 100%",
                onClick: async () => {
                    await router.push(getRouterPathWithLang("/user", locale.value));
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => t('user'),
                icon: () => h(NIcon, { component: User }),
            }
        ),
        key: "user",
        show: !isTelegram.value
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "admin" ? "primary" : "default",
                class: "nav-button",
                style: "width: 100%",
                onClick: async () => {
                    loading.value = true;
                    await router.push(getRouterPathWithLang('/admin', locale.value));
                    loading.value = false;
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => "Admin",
                icon: () => h(NIcon, { component: AdminPanelSettingsFilled }),
            }
        ),
        show: showAdminPage.value,
        key: "admin"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                class: "nav-button",
                style: "width: 100%",
                onClick: () => { toggleDark(); showMobileMenu.value = false; }
            },
            {
                default: () => isDark.value ? t('light') : t('dark'),
                icon: () => h(
                    NIcon, { component: isDark.value ? LightModeFilled : DarkModeFilled }
                )
            }
        ),
        key: "theme"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                class: "nav-button",
                style: "width: 100%",
                onClick: async () => {
                    locale.value == 'id' ? await changeLocale('en') : await changeLocale('id');
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => locale.value == 'id' ? "English" : "Indonesia",
                icon: () => h(
                    NIcon, { component: Language }
                )
            }
        ),
        key: "lang"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                class: "nav-button",
                style: "width: 100%",
                tag: "a",
                target: "_blank",
                href: "https://github.com/dreamhunter2333/cloudflare_temp_email",
            },
            {
                default: () => version || "Github",
                icon: () => h(NIcon, { component: GithubAlt })
            }
        ),
        show: openSettings.value?.showGithub,
        key: "github"
    }
]);

useHead({
    title: () => openSettings.value.title || t('title'),
    meta: [
        { name: "description", content: openSettings.value.description || t('title') },
    ]
});

const logoClickCount = ref(0);
const logoClick = async () => {
    if (route.path.includes("admin")) {
        logoClickCount.value = 0;
        return;
    }
    if (logoClickCount.value >= 5) {
        logoClickCount.value = 0;
        message.info("Change to admin Page");
        loading.value = true;
        await router.push(getRouterPathWithLang('/admin', locale.value));
        loading.value = false;
    } else {
        logoClickCount.value++;
    }
    if (logoClickCount.value > 0) {
        message.info(`Click ${5 - logoClickCount.value + 1} times to enter the admin page`);
    }
}

onMounted(async () => {
    await api.getOpenSettings(message, notification);
    // make sure user_id is fetched
    if (!userSettings.value.user_id) await api.getUserSettings(message);
    const hour = new Date().getHours();
    const greeting =
        hour >= 5 && hour < 12
            ? t('greetingMorning')
            : hour >= 12 && hour < 18
                ? t('greetingAfternoon')
                : t('greetingEvening');
    const emailKey = userSettings.value.user_email || 'guest';
    const todayKey = new Date().toISOString().slice(0, 10);
    const greetingKey = `greeting-${emailKey}-${todayKey}`;
    if (!localStorage.getItem(greetingKey)) {
        notification.success({
            title: greeting,
            content: openSettings.value.title || t('title'),
            duration: 4000
        });
        localStorage.setItem(greetingKey, 'shown');
    }
});
</script>

<template>
    <div class="header-shell">
        <n-page-header>
            <template #title>
                <h4 class="header-title">{{ openSettings.title || t('title') }}</h4>
            </template>
            <template #avatar>
                <div @click="logoClick">
                    <n-avatar style="margin-left: 10px;" src="/logo.png" />
                </div>
            </template>
            <template #extra>
                <n-space>
                    <n-menu v-if="!isMobile" mode="horizontal" :options="menuOptions" responsive />
                    <n-button v-else :text="true" class="menu-toggle" @click="showMobileMenu = !showMobileMenu"
                        style="margin-right: 10px;">
                        <template #icon>
                            <n-icon :component="MenuFilled" />
                        </template>
                        {{ t('menu') }}
                    </n-button>
                </n-space>
            </template>
        </n-page-header>
        <n-drawer v-model:show="showMobileMenu" placement="top" style="height: 60vh;">
            <n-drawer-content :title="t('menu')" closable>
                <n-menu :options="menuOptions" />
            </n-drawer-content>
        </n-drawer>
        <n-modal v-model:show="showAuth" :closable="false" :closeOnEsc="false" :maskClosable="false" preset="dialog"
            :title="t('accessHeader')">
            <p>{{ t('accessTip') }}</p>
            <n-input v-model:value="auth" type="password" show-password-on="click" />
            <template #action>
                <n-button :loading="loading" @click="authFunc" type="primary">
                    {{ t('ok') }}
                </n-button>
            </template>
        </n-modal>
    </div>
</template>

<style scoped>
.n-layout-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.header-shell {
    padding-top: 20px;
    position: relative;
    overflow: hidden;
    isolation: isolate;
}

.n-page-header {
    padding-top: 48px;
    padding-bottom: 18px;
    position: relative;
    z-index: 1;
}

.header-shell::before,
.header-shell::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.7;
}

.header-shell::before {
    background-image:
        radial-gradient(circle at 15% 30%, rgba(255, 255, 255, 0.55) 0, rgba(255, 255, 255, 0.12) 6px, transparent 7px),
        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.4) 0, rgba(255, 255, 255, 0.1) 5px, transparent 6px),
        radial-gradient(circle at 10% 80%, rgba(255, 255, 255, 0.35) 0, rgba(255, 255, 255, 0.08) 5px, transparent 6px),
        radial-gradient(circle at 70% 75%, rgba(255, 255, 255, 0.45) 0, rgba(255, 255, 255, 0.1) 6px, transparent 7px);
    background-size: clamp(180px, 25vw, 260px) clamp(180px, 25vw, 260px);
    filter: blur(0.4px);
    animation: header-particle-drift 18s ease-in-out infinite;
}

.header-shell::after {
    background-image:
        radial-gradient(circle at 35% 40%, rgba(125, 211, 252, 0.3) 0, rgba(125, 211, 252, 0.06) 5px, transparent 6px),
        radial-gradient(circle at 60% 10%, rgba(186, 230, 253, 0.28) 0, rgba(186, 230, 253, 0.06) 6px, transparent 7px),
        radial-gradient(circle at 90% 60%, rgba(148, 163, 184, 0.25) 0, rgba(148, 163, 184, 0.05) 5px, transparent 6px);
    background-size: clamp(200px, 28vw, 300px) clamp(200px, 28vw, 300px);
    opacity: 0.55;
    animation: header-particle-drift 24s ease-in-out infinite reverse;
}

@keyframes header-particle-drift {
    0% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(-12px, -18px, 0);
    }

    100% {
        transform: translate3d(0, 0, 0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .header-shell::before,
    .header-shell::after {
        animation: none;
    }
}

.n-page-header :deep(.n-page-header__avatar),
.n-page-header :deep(.n-page-header__title) {
    margin-top: 14px;
}

.menu-toggle {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 999px;
    padding: 2px 10px;
}

:deep(.nav-button) {
    border-radius: 999px;
    padding: 4px 12px;
}

:deep(.nav-button .n-button__content) {
    gap: 8px;
}

.menu-toggle :deep(.n-button__content) {
    color: inherit;
}

.n-alert {
    margin-top: 10px;
    margin-bottom: 10px;
    text-align: center;
}

.n-card {
    margin-top: 10px;
}

.center {
    display: flex;
    text-align: left;
    place-items: center;
    justify-content: center;
    margin: 20px;
}

.n-form .n-button {
    margin-top: 10px;
}

.header-title {
    margin: 0;
    font-size: 20px;
    line-height: 1.3;
}

@media (max-width: 600px) {
    .header-title {
        font-size: 18px;
    }
}
</style>
