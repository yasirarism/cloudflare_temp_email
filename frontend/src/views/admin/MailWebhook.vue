<script setup lang="ts">
import { computed } from 'vue'
// @ts-ignore
import { api } from '../../api'

// @ts-ignore
import WebhookComponent from '../../components/WebhookComponent.vue'
import { useGlobalState } from '../../store'

const { openSettings } = useGlobalState()
const domainOptions = computed(() => openSettings.value.domains || [])

const fetchData = async () => {
    return await api.fetch(`/admin/mail_webhook/settings`)
}

const saveSettings = async (webhookSettings: any) => {
    await api.fetch(`/admin/mail_webhook/settings`, {
        method: 'POST',
        body: JSON.stringify(webhookSettings),
    })
}

const testSettings = async (webhookSettings: any) => {
    await api.fetch(`/admin/mail_webhook/test`, {
        method: 'POST',
        body: JSON.stringify(webhookSettings),
    })
}

</script>

<template>
    <WebhookComponent :fetchData="fetchData" :saveSettings="saveSettings" :testSettings="testSettings"
        :showDomainFilter="true" :domainOptions="domainOptions" />
</template>
