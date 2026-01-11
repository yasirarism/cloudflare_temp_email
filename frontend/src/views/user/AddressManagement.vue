<script setup>
import { ref, h, onMounted } from 'vue';
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router';
import { NBadge, NPopconfirm, NButton, NSwitch } from 'naive-ui'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import { getRouterPathWithLang } from '../../utils'

import Login from '../common/Login.vue';

const { jwt, settings } = useGlobalState()
const message = useMessage()
const router = useRouter()

const { locale, t } = useI18n({
    messages: {
        en: {
            success: 'success',
            name: 'Name',
            mail_count: 'Mail Count',
            send_count: 'Send Count',
            actions: 'Actions',
            changeMailAddress: 'Change Address',
            unbindAddress: 'Unbind Address',
            unbindAddressTip: 'Before unbinding, please switch to this email address and save the email address credential.',
            transferAddress: 'Transfer Address',
            targetUserEmail: 'Target User Email',
            transferAddressTip: 'Transfer address to another user will remove the address from your account and transfer it to another user. Are you sure to transfer the address?',
            address: 'Address',
            create_or_bind: 'Create or Bind',
            publicAccess: 'Public Access',
            publicAccessEnabled: 'Public',
            publicAccessDisabled: 'Private',
        },
        zh: {
            success: '成功',
            name: '名称',
            mail_count: '邮件数量',
            send_count: '发送数量',
            actions: '操作',
            changeMailAddress: '切换地址',
            unbindAddress: '解绑地址',
            unbindAddressTip: '解绑前请切换到此邮箱地址并保存邮箱地址凭证。',
            transferAddress: '转移地址',
            targetUserEmail: '目标用户邮箱',
            transferAddressTip: '转移地址到其他用户将会从你的账户中移除此地址并转移给其他用户。确定要转移地址吗？',
            address: '地址',
            create_or_bind: '创建或绑定',
            publicAccess: '公开访问',
            publicAccessEnabled: '公开',
            publicAccessDisabled: '私有',
        }
    }
});

const data = ref([])
const showTranferAddress = ref(false)
const currentAddress = ref("")
const currentAddressId = ref(0)
const targetUserEmail = ref('')

const changeMailAddress = async (address_id) => {
    try {
        const res = await api.fetch(`/user_api/bind_address_jwt/${address_id}`);
        message.success(t('changeMailAddress') + " " + t('success'));
        if (!res.jwt) {
            message.error("jwt not found");
            return;
        }
        jwt.value = res.jwt;
        await router.push(getRouterPathWithLang("/", locale.value))
        location.reload();
    } catch (error) {
        console.log(error)
        message.error(error.message || "error");
    }
}

const unbindAddress = async (address_id) => {
    try {
        const res = await api.fetch(`/user_api/unbind_address`, {
            method: 'POST',
            body: JSON.stringify({ address_id })
        });
        message.success(t('unbindAddress') + " " + t('success'));
        await fetchData();
    } catch (error) {
        console.log(error)
        message.error(error.message || "error");
    }
}

const transferAddress = async () => {
    if (!targetUserEmail.value) {
        message.error("targetUserEmail is required");
        return;
    }
    if (!currentAddressId.value) {
        message.error("currentAddressId is required");
        return;
    }
    try {
        const res = await api.fetch(`/user_api/transfer_address`, {
            method: 'POST',
            body: JSON.stringify({
                address_id: currentAddressId.value,
                target_user_email: targetUserEmail.value
            })
        });
        message.success(t('transferAddress') + " " + t('success'));
        await fetchData();
        showTranferAddress.value = false;
        currentAddressId.value = 0;
        currentAddress.value = "";
        targetUserEmail.value = "";
    } catch (error) {
        console.log(error)
        message.error(error.message || "error");
    }
}

const fetchData = async () => {
    try {
        const { results } = await api.fetch(
            `/user_api/bind_address`
        );
        data.value = results;
    } catch (error) {
        console.log(error)
        message.error(error.message || "error");
    }
}

const updatePublicAccess = async (row, enabled) => {
    try {
        await api.fetch(`/user_api/address_visibility`, {
            method: 'POST',
            body: JSON.stringify({
                address_id: row.id,
                public_access: enabled,
            })
        });
        row.public_access = enabled ? 1 : 0;
        if (row.name === settings.value.address) {
            settings.value.public_access = enabled;
        }
        message.success(t('success'));
    } catch (error) {
        message.error(error.message || "error");
    }
}

const columns = [
    {
        title: t('name'),
        key: "name",
        width: 240,
        ellipsis: {
            tooltip: true
        },
        render(row) {
            return h('span', { class: 'address-cell' }, row.name)
        }
    },
    {
        title: t('mail_count'),
        key: "mail_count",
        render(row) {
            return h('span', { class: 'count-text' }, String(row.mail_count))
        }
    },
    {
        title: t('send_count'),
        key: "send_count",
        render(row) {
            return h('span', { class: 'count-text' }, String(row.send_count))
        }
    },
    {
        title: t('actions'),
        key: 'actions',
        width: 260,
        render(row) {
            return h('div', { class: 'action-group' }, [
                h(NSwitch, {
                    value: !!row.public_access,
                    'onUpdate:value': (value) => updatePublicAccess(row, value),
                }, {
                    checked: () => t('publicAccessEnabled'),
                    unchecked: () => t('publicAccessDisabled'),
                }),
                h(NPopconfirm,
                    {
                        onPositiveClick: () => changeMailAddress(row.id)
                    },
                    {
                        trigger: () => h(NButton,
                            {
                                tertiary: true,
                                type: "primary",
                            },
                            { default: () => t('changeMailAddress') }
                        ),
                        default: () => `${t('changeMailAddress')}?`
                    }
                ),
                h(NButton,
                    {
                        tertiary: true,
                        type: "primary",
                        onClick: () => {
                            currentAddressId.value = row.id;
                            currentAddress.value = row.name;
                            showTranferAddress.value = true;
                        }
                    },
                    { default: () => t('transferAddress') }
                ),
                h(NPopconfirm,
                    {
                        onPositiveClick: () => unbindAddress(row.id)
                    },
                    {
                        trigger: () => h(NButton,
                            {
                                tertiary: true,
                                type: "error",
                            },
                            { default: () => t('unbindAddress') }
                        ),
                        default: () => t('unbindAddressTip')
                    }
                ),
            ])
        }
    }
]

onMounted(async () => {
    await fetchData()
})
</script>

<template>
    <div>
        <n-modal v-model:show="showTranferAddress" preset="dialog" :title="t('transferAddress')">
            <span>
                <p>{{ t("transferAddressTip") }}</p>
                <p>{{ t('transferAddress') + ": " + currentAddress }}</p>
                <n-input v-model:value="targetUserEmail" :placeholder="t('targetUserEmail')" />
            </span>
            <template #action>
                <n-button :loading="loading" @click="transferAddress" size="small" tertiary type="error">
                    {{ t('transferAddress') }}
                </n-button>
            </template>
        </n-modal>
        <n-tabs type="segment">
            <n-tab-pane name="address" :tab="t('address')">
                <div class="table-scroll">
                    <n-data-table :columns="columns" :data="data" :bordered="false" embedded />
                </div>
            </n-tab-pane>
            <n-tab-pane name="create_or_bind" :tab="t('create_or_bind')">
                <Login />
            </n-tab-pane>
        </n-tabs>
    </div>
</template>

<style scoped>
.table-scroll {
    overflow: auto;
    max-height: 60vh;
}

.n-data-table {
    min-width: 520px;
}

.action-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.action-group :deep(.n-button) {
    min-width: 0;
}

.address-cell {
    display: inline-block;
    max-width: 240px;
    width: 100%;
    white-space: normal;
    word-break: break-word;
}

.count-text {
    align-items: center;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.45);
    color: #fff;
    display: inline-flex;
    font-size: 12px;
    font-weight: 600;
    height: 28px;
    justify-content: center;
    min-width: 28px;
    width: 28px;
    padding: 0;
}

@media (max-width: 720px) {
    .action-group {
        flex-direction: column;
        align-items: stretch;
    }

    .action-group :deep(.n-button),
    .action-group :deep(.n-switch) {
        width: 100%;
        justify-content: center;
    }

    .action-group :deep(.n-button__content) {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .action-group :deep(.n-button) {
        min-width: 0;
    }

    .address-cell {
        max-width: 200px;
    }
}
</style>
