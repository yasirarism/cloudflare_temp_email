<script setup>
import { useI18n } from 'vue-i18n'
import { useGlobalState } from '../store'
const { openSettings } = useGlobalState()


const { t } = useI18n({
    messages: {
        en: {
            copyright: "Copyright"
        },
        zh: {
            copyright: "版权所有"
        }
    }
});

</script>

<template>
    <footer class="app-footer">
        <div class="footer-content">
            <n-space justify="center" align="center">
                <n-text depth="3">
                    {{ t('copyright') }} © 2023-{{ new Date().getFullYear() }}
                </n-text>
                <n-text depth="3">
                    <div v-html="openSettings.copyright"></div>
                </n-text>
            </n-space>
        </div>
    </footer>
</template>


<style scoped>
.app-footer {
    border-top: 1px solid var(--glass-border);
    padding: 24px 16px;
    text-align: center;
    color: inherit;
}

.footer-content {
    max-width: 96rem;
    margin: 0 auto;
}
</style>
