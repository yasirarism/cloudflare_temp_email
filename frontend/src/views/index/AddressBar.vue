<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { User, ExchangeAlt } from '@vicons/fa'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import Login from '../common/Login.vue'
import TelegramAddress from './TelegramAddress.vue'
import LocalAddress from './LocalAddress.vue'
import AddressManagement from '../user/AddressManagement.vue'
import { getRouterPathWithLang } from '../../utils'
import AddressSelect from '../../components/AddressSelect.vue'
import { useIsMobile } from '../../utils/composables'

const router = useRouter()
const isMobile = useIsMobile()

const {
    jwt, settings, showAddressCredential, userJwt,
    isTelegram, addressPassword
} = useGlobalState()

const { locale, t } = useI18n({
    messages: {
        en: {
            ok: 'OK',
            fetchAddressError: 'Mail address credential is invalid or account not exist, it may be network connection issue, please try again later.',
            addressCredential: 'Mail Address Credential',
            linkWithAddressCredential: 'Open to auto login email link',
            addressCredentialTip: 'Please copy the Mail Address Credential and you can use it to login to your email account.',
            addressPassword: 'Address Password',
            userLogin: 'User Login',
            addressManage: 'Manage',
            publicAccess: 'Public access enabled',
            publicAccessDisabled: 'Public access is disabled for this address.',
            privateAccess: 'Private (JWT)',
            publicAccessLabel: 'Public (Address)',
        },
        zh: {
            ok: '确定',
            fetchAddressError: '邮箱地址凭证无效或邮箱地址不存在，也可能是网络连接异常，请稍后再尝试。',
            addressCredential: '邮箱地址凭证',
            linkWithAddressCredential: '打开即可自动登录邮箱的链接',
            addressCredentialTip: '请复制邮箱地址凭证，你可以使用它登录你的邮箱。',
            addressPassword: '地址密码',
            userLogin: '用户登录',
            addressManage: '地址管理',
            publicAccess: '已启用公开访问',
            publicAccessDisabled: '该地址未启用公开访问。',
            privateAccess: '私有 (JWT)',
            publicAccessLabel: '公开 (地址)',
        }
    }
});

const showAddressManage = ref(false)
const accessMode = ref('private')

const getUrlWithJwt = () => {
    return `${window.location.origin}/?jwt=${jwt.value}`
}

const getPublicUrl = computed(() => {
    if (!settings.value.address) return '';
    return `${window.location.origin}/${locale.value}/${settings.value.address}`
})

const getAccessUrl = computed(() => {
    if (accessMode.value === 'public') {
        return getPublicUrl.value;
    }
    return getUrlWithJwt();
})

const onUserLogin = async () => {
    await router.push(getRouterPathWithLang("/user", locale.value))
}

onMounted(async () => {
    await api.getSettings();
});
</script>

<template>
    <div>
        <n-card :bordered="false" embedded v-if="!settings.fetched">
            <n-skeleton style="height: 50vh" />
        </n-card>
        <div v-else-if="settings.address">
            <n-alert type="info" :show-icon="false" :bordered="false">
                <AddressSelect>
                    <template #actions>
                        <n-button class="address-manage" size="small" tertiary type="primary"
                            @click="showAddressManage = true">
                            <n-icon :component="ExchangeAlt" />
                            {{ t('addressManage') }}
                        </n-button>
                    </template>
                </AddressSelect>
            </n-alert>
        </div>
        <div v-else-if="isTelegram">
            <TelegramAddress />
        </div>
        <div v-else-if="userJwt" class="center">
            <n-card :bordered="false" embedded style="max-width: 900px; width: 100%;">
                <AddressManagement />
            </n-card>
        </div>
        <div v-else class="center">
            <n-card :bordered="false" embedded style="max-width: 600px;">
                <n-alert v-if="jwt" type="warning" :show-icon="false" :bordered="false" closable>
                    <span>{{ t('fetchAddressError') }}</span>
                </n-alert>
                <Login />
                <n-divider />
                <n-button @click="onUserLogin" type="primary" block secondary strong>
                    <template #icon>
                        <n-icon :component="User" />
                    </template>
                    {{ t('userLogin') }}
                </n-button>
            </n-card>
        </div>
        <n-modal v-model:show="showAddressCredential" preset="dialog" :title="t('addressCredential')">
            <span>
                <p>{{ t("addressCredentialTip") }}</p>
            </span>
            <n-alert v-if="settings.public_access" type="success" :show-icon="false" :bordered="false"
                style="margin-bottom: 12px;">
                {{ t('publicAccess') }}
            </n-alert>
            <n-alert v-else type="warning" :show-icon="false" :bordered="false" style="margin-bottom: 12px;">
                {{ t('publicAccessDisabled') }}
            </n-alert>
            <n-radio-group v-model:value="accessMode" size="small" style="margin-bottom: 12px;">
                <n-radio value="private">{{ t('privateAccess') }}</n-radio>
                <n-radio value="public" :disabled="!settings.public_access">{{ t('publicAccessLabel') }}</n-radio>
            </n-radio-group>
            <n-card embedded>
                <b>{{ jwt }}</b>
            </n-card>
            <n-card embedded v-if="addressPassword">
                <p><b>{{ settings.address }}</b></p>
                <p>{{ t('addressPassword') }}: <b>{{ addressPassword }}</b></p>
            </n-card>
            <n-card embedded>
                <n-collapse>
                    <n-collapse-item :title='t("linkWithAddressCredential")'>
                        <n-card embedded>
                            <b>{{ getAccessUrl }}</b>
                        </n-card>
                    </n-collapse-item>
                </n-collapse>
            </n-card>
        </n-modal>
        <n-modal v-model:show="showAddressManage" preset="card" :title="t('addressManage')"
            :style="{ width: isMobile ? '92vw' : '720px', maxWidth: '720px' }">
            <TelegramAddress v-if="isTelegram" />
            <AddressManagement v-else-if="userJwt" />
            <LocalAddress v-else />
        </n-modal>
    </div>
</template>

<style scoped>
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

.address-manage {
    flex: 0 0 auto;
    white-space: nowrap;
}
</style>
