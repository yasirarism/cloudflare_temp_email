<script setup>
import { watch, onMounted, ref, onBeforeUnmount, computed } from "vue";
import { useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useGlobalState } from '../store'
import { CloudDownloadRound, ArrowBackIosNewFilled, ArrowForwardIosFilled, AutorenewRound } from '@vicons/material'
import { useIsMobile } from '../utils/composables'
import { processItem } from '../utils/email-parser'
import { utcToLocalDate } from '../utils';
import MailContentRenderer from "./MailContentRenderer.vue";
import AiExtractInfo from "./AiExtractInfo.vue";

const message = useMessage()
const isMobile = useIsMobile()

const props = defineProps({
  enableUserDeleteEmail: {
    type: Boolean,
    default: false,
    required: false
  },
  showEMailTo: {
    type: Boolean,
    default: true,
    required: false
  },
  fetchMailData: {
    type: Function,
    default: () => { },
    required: true
  },
  deleteMail: {
    type: Function,
    default: () => { },
    required: false
  },
  showReply: {
    type: Boolean,
    default: false,
    required: false
  },
  showSaveS3: {
    type: Boolean,
    default: false,
    required: false
  },
  saveToS3: {
    type: Function,
    default: (mail_id, filename, blob) => { },
    required: false
  },
  showFilterInput: {
    type: Boolean,
    default: false,
    required: false
  },
  enableRealtime: {
    type: Boolean,
    default: true,
    required: false
  },
})

const localFilterKeyword = ref('')

const {
  isDark, mailboxSplitSize, indexTab, useUTCDate,
  autoRefresh, configAutoRefreshInterval, sendMailModel
} = useGlobalState()
const mailLoading = ref(false)
const autoRefreshInterval = ref(configAutoRefreshInterval.value)
const pageRefreshOptions = ref(null)
const rawData = ref([])
const timer = ref(null)
const realtimeTimer = ref(null)
const latestMailId = ref(null)
const processedCache = new Map()
const realtimeIntervalMs = 5000

const count = ref(0)
const page = ref(1)
const pageSize = ref(20)

// Computed property for filtered data (only filter current page)
const data = computed(() => {
  if (!localFilterKeyword.value || localFilterKeyword.value.trim() === '') {
    return rawData.value;
  }
  const keyword = localFilterKeyword.value.toLowerCase();
  return rawData.value.filter(mail => {
    // Search in subject, text, message fields
    const searchFields = [
      mail.subject || '',
      mail.text || '',
      mail.message || ''
    ].map(field => field.toLowerCase());
    return searchFields.some(field => field.includes(keyword));
  });
})

const canGoPrevMail = computed(() => {
  if (!curMail.value) return false
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)
  return currentIndex > 0 || page.value > 1
})

const canGoNextMail = computed(() => {
  if (!curMail.value) return false
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)
  return currentIndex < data.value.length - 1 || count.value > page.value * pageSize.value
})

const prevMail = async () => {
  if (!canGoPrevMail.value) return
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)

  if (currentIndex > 0) {
    curMail.value = data.value[currentIndex - 1]
  } else if (page.value > 1) {
    page.value--
    await refresh()
    if (data.value.length > 0) {
      curMail.value = data.value[data.value.length - 1]
    }
  }
}

const nextMail = async () => {
  if (!canGoNextMail.value) return
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)

  if (currentIndex < data.value.length - 1) {
    curMail.value = data.value[currentIndex + 1]
  } else if (count.value > page.value * pageSize.value) {
    page.value++
    await refresh()
    if (data.value.length > 0) {
      curMail.value = data.value[0]
    }
  }
}

const curMail = ref(null);

const multiActionMode = ref(false)
const showMultiActionDownload = ref(false)
const showMultiActionDelete = ref(false)
const multiActionDownloadZip = ref({})
const multiActionDeleteProgress = ref({ percentage: 0, tip: '0/0' })

const { t } = useI18n({
  messages: {
    en: {
      success: 'Success',
      autoRefresh: 'Auto Refresh',
      refreshAfter: 'Refresh After {msg} Seconds',
      refresh: 'Refresh',
      attachments: 'Show Attachments',
      downloadMail: 'Download Mail',
      pleaseSelectMail: "Please select mail",
      delete: 'Delete',
      deleteMailTip: 'Are you sure you want to delete mail?',
      reply: 'Reply',
      forwardMail: 'Forward',
      showTextMail: 'Show Text Mail',
      showHtmlMail: 'Show Html Mail',
      saveToS3: 'Save to S3',
      multiAction: 'Multi Action',
      cancelMultiAction: 'Cancel Multi Action',
      selectAll: 'Select All of This Page',
      unselectAll: 'Unselect All',
      prevMail: 'Previous',
      nextMail: 'Next',
      keywordQueryTip: 'Filter current page',
      query: 'Query',
    },
    zh: {
      success: '成功',
      autoRefresh: '自动刷新',
      refreshAfter: '{msg}秒后刷新',
      refresh: '刷新',
      downloadMail: '下载邮件',
      attachments: '查看附件',
      pleaseSelectMail: "请选择邮件",
      delete: '删除',
      deleteMailTip: '确定要删除邮件吗?',
      reply: '回复',
      forwardMail: '转发',
      showTextMail: '显示纯文本邮件',
      showHtmlMail: '显示HTML邮件',
      saveToS3: '保存到S3',
      multiAction: '多选',
      cancelMultiAction: '取消多选',
      selectAll: '全选本页',
      unselectAll: '取消全选',
      prevMail: '上一封',
      nextMail: '下一封',
      keywordQueryTip: '过滤当前页',
      query: '查询',
    }
  }
});

const setupAutoRefresh = async (autoRefresh) => {
  // auto refresh every configAutoRefreshInterval seconds
  autoRefreshInterval.value = configAutoRefreshInterval.value;
  if (autoRefresh) {
    clearInterval(timer.value);
    timer.value = setInterval(async () => {
      if (mailLoading.value) return;
      autoRefreshInterval.value--;
      if (autoRefreshInterval.value <= 0) {
        autoRefreshInterval.value = configAutoRefreshInterval.value;
        await backFirstPageAndRefresh({ showLoading: false, preserveSelection: true });
      }
    }, 1000)
  } else {
    clearInterval(timer.value)
    timer.value = null
  }
}

const buildProcessedItem = async (item) => {
  const cached = processedCache.get(item.id);
  if (cached && cached.raw === item.raw) {
    return { ...cached, checked: false };
  }
  const processed = await processItem({ ...item });
  processedCache.set(item.id, processed);
  return { ...processed, checked: false };
}

watch(autoRefresh, async (autoRefresh, old) => {
  setupAutoRefresh(autoRefresh)
}, { immediate: true })

watch([page, pageSize], async ([page, pageSize], [oldPage, oldPageSize]) => {
  if (page !== oldPage || pageSize !== oldPageSize) {
    const options = pageRefreshOptions.value || undefined;
    pageRefreshOptions.value = null;
    await refresh(options);
  }
})

const refresh = async ({ showLoading = true, preserveSelection = true } = {}) => {
  if (showLoading) {
    mailLoading.value = true;
  }
  try {
    const previousIds = new Set(rawData.value.map((item) => item.id));
    const { results, count: totalCount } = await props.fetchMailData(
      pageSize.value, (page.value - 1) * pageSize.value
    );
    const processedResults = await Promise.all(
      results.map(async (item) => buildProcessedItem(item))
    );
    const shouldMarkNew = !!latestMailId.value && page.value === 1;
    const updatedResults = processedResults.map((item) => ({
      ...item,
      isNew: shouldMarkNew && !previousIds.has(item.id),
    }));
    rawData.value = updatedResults;
    if (shouldMarkNew && updatedResults.some((item) => item.isNew)) {
      setTimeout(() => {
        rawData.value = rawData.value.map((item) =>
          item.isNew ? { ...item, isNew: false } : item
        );
      }, 1800);
    }
    if (typeof totalCount === 'number' && totalCount >= 0) {
      count.value = totalCount;
    }
    if (processedResults.length > 0) {
      latestMailId.value = processedResults[0].id;
    }
    if (preserveSelection && curMail.value) {
      const updatedSelection = processedResults.find(mail => mail.id === curMail.value.id);
      curMail.value = updatedSelection || (!isMobile.value ? processedResults[0] || null : null);
    } else {
      curMail.value = !isMobile.value && processedResults.length > 0
        ? processedResults[0]
        : null;
    }
  } catch (error) {
    message.error(error.message || "error");
    console.error(error);
  } finally {
    if (showLoading) {
      mailLoading.value = false;
    }
  }
};

const backFirstPageAndRefresh = async ({ showLoading = true, preserveSelection = true } = {}) => {
  if (page.value === 1) {
    await refresh({ showLoading, preserveSelection });
    return;
  }
  pageRefreshOptions.value = { showLoading, preserveSelection };
  page.value = 1;
}

const checkForNewMail = async () => {
  if (!props.enableRealtime || autoRefresh.value || mailLoading.value || page.value !== 1) {
    return;
  }
  try {
    const { results, count: totalCount } = await props.fetchMailData(1, 0);
    if (typeof totalCount === 'number' && totalCount >= 0) {
      count.value = totalCount;
    }
    const latestId = results?.[0]?.id || null;
    if (latestId && latestId !== latestMailId.value) {
      await refresh({ showLoading: false, preserveSelection: false });
    }
  } catch (error) {
    console.error(error);
  }
}

const startRealtime = () => {
  clearInterval(realtimeTimer.value);
  realtimeTimer.value = null;
  if (!props.enableRealtime || autoRefresh.value) {
    return;
  }
  realtimeTimer.value = setInterval(checkForNewMail, realtimeIntervalMs);
}

watch([() => props.enableRealtime, autoRefresh], startRealtime, { immediate: true })

const clickRow = async (row) => {
  if (multiActionMode.value) {
    row.checked = !row.checked;
    return;
  }
  if (curMail.value?.id === row.id) {
    return;
  }
  requestAnimationFrame(() => {
    curMail.value = row;
  });
};


const mailItemClass = (row) => {
  return curMail.value && row.id == curMail.value.id ? 'mail-item-selected glass-panel' : '';
};

const deleteMail = async () => {
  try {
    mailLoading.value = true;
    await props.deleteMail(curMail.value.id);
    message.success(t("success"));
    curMail.value = null;
    await refresh();
  } catch (error) {
    message.error(error.message || "error");
  } finally {
    mailLoading.value = false;
  }
};

const replyMail = async () => {
  const emailRegex = /(.+?) <(.+?)>/;
  let toMail = curMail.value.originalSource;
  let toName = ""
  const match = emailRegex.exec(curMail.value.source);
  if (match) {
    toName = match[1];
    toMail = match[2];
  }
  Object.assign(sendMailModel.value, {
    toName: toName,
    toMail: toMail,
    subject: `${t('reply')}: ${curMail.value.subject}`,
    contentType: 'rich',
    content: curMail.value.text ? `<p><br></p><blockquote>${curMail.value.text}</blockquote><p><br></p>` : '',
  });
  indexTab.value = 'sendmail';
};

const forwardMail = async () => {
  Object.assign(sendMailModel.value, {
    subject: `${t('forwardMail')}: ${curMail.value.subject}`,
    contentType: curMail.value.message ? 'html' : 'text',
    content: curMail.value.message || curMail.value.text,
  });
  indexTab.value = 'sendmail';
};

const onSpiltSizeChange = (size) => {
  mailboxSplitSize.value = size;
}

const saveToS3Proxy = async (filename, blob) => {
  await props.saveToS3(curMail.value.id, filename, blob);
}

const multiActionModeClick = (enableMulti) => {
  if (enableMulti) {
    data.value.forEach((item) => {
      item.checked = false;
    });
    multiActionMode.value = true;
  } else {
    multiActionMode.value = false;
    data.value.forEach((item) => {
      item.checked = false;
    });
  }
}

const multiActionSelectAll = (checked) => {
  data.value.forEach((item) => {
    item.checked = checked;
  });
}

const multiActionDeleteMail = async () => {
  try {
    mailLoading.value = true;
    const selectedMails = data.value.filter((item) => item.checked);
    if (selectedMails.length === 0) {
      message.error(t('pleaseSelectMail'));
      return;
    }
    multiActionDeleteProgress.value = {
      percentage: 0,
      tip: `0/${selectedMails.length}`
    };
    for (const [index, mail] of selectedMails.entries()) {
      await props.deleteMail(mail.id);
      showMultiActionDelete.value = true;
      multiActionDeleteProgress.value = {
        percentage: Math.floor((index + 1) / selectedMails.length * 100),
        tip: `${index + 1}/${selectedMails.length}`
      };
    }
    message.success(t("success"));
    await refresh();
  } catch (error) {
    message.error(error.message || "error");
  } finally {
    mailLoading.value = false;
    showMultiActionDelete.value = true;
  }
}

const multiActionDownload = async () => {
  try {
    mailLoading.value = true;
    const selectedMails = data.value.filter((item) => item.checked);
    if (selectedMails.length === 0) {
      message.error(t('pleaseSelectMail'));
      return;
    }
    const JSZipModlue = await import('jszip');
    const JSZip = JSZipModlue.default;
    const zip = new JSZip();
    for (const mail of selectedMails) {
      zip.file(`${mail.id}.eml`, mail.raw);
    }
    multiActionDownloadZip.value = {
      url: URL.createObjectURL(await zip.generateAsync({ type: "blob" })),
      filename: `mails-${new Date().toISOString().replace(/:/g, '-')}.zip`
    }
    showMultiActionDownload.value = true;
  } catch (error) {
    message.error(error.message || "error");
  } finally {
    mailLoading.value = false;
  }
}

const manualRefreshSpin = ref(false)
const triggerManualRefresh = async () => {
  manualRefreshSpin.value = true;
  await backFirstPageAndRefresh({ showLoading: true, preserveSelection: true });
  setTimeout(() => {
    manualRefreshSpin.value = false;
  }, 1200);
}

const drawerVisible = computed(() => !!curMail.value)
const handleDrawerUpdate = (value) => {
  if (!value) {
    curMail.value = null
  }
}

onMounted(async () => {
  await refresh();
  startRealtime();
});

onBeforeUnmount(() => {
  clearInterval(timer.value)
  clearInterval(realtimeTimer.value)
})
</script>

<template>
  <div>
    <div v-if="!isMobile" class="left">
      <div style="margin-bottom: 10px;">
        <n-space v-if="multiActionMode" align="center">
          <n-button @click="multiActionModeClick(false)" tertiary>
            {{ t('cancelMultiAction') }}
          </n-button>
          <n-button @click="multiActionSelectAll(true)" tertiary>
            {{ t('selectAll') }}
          </n-button>
          <n-button @click="multiActionSelectAll(false)" tertiary>
            {{ t('unselectAll') }}
          </n-button>
          <n-popconfirm v-if="enableUserDeleteEmail" @positive-click="multiActionDeleteMail">
            <template #trigger>
              <n-button tertiary type="error">{{ t('delete') }}</n-button>
            </template>
            {{ t('deleteMailTip') }}
          </n-popconfirm>
          <n-button @click="multiActionDownload" tertiary type="info">
            <template #icon>
              <n-icon :component="CloudDownloadRound" />
            </template>
            {{ t('downloadMail') }}
          </n-button>
        </n-space>
        <n-space v-else align="center">
          <n-button @click="multiActionModeClick(true)" type="primary" tertiary>
            {{ t('multiAction') }}
          </n-button>
          <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count" :page-sizes="[20, 50, 100]"
            show-size-picker />
          <n-tooltip>
            <template #trigger>
              <n-icon :class="['auto-refresh-spinner', { 'is-active': mailLoading, 'is-manual': manualRefreshSpin }]">
                <AutorenewRound />
              </n-icon>
            </template>
            {{ t('refreshAfter', { msg: autoRefreshInterval }) }}
          </n-tooltip>
          <n-button @click="triggerManualRefresh" type="primary" tertiary>
            {{ t('refresh') }}
          </n-button>
          <n-input v-if="showFilterInput" v-model:value="localFilterKeyword"
            :placeholder="t('keywordQueryTip')" style="width: 200px; display: flex; align-items: center;"
            clearable />
        </n-space>
      </div>
      <n-split class="left" direction="horizontal" :max="0.75" :min="0.25" :default-size="mailboxSplitSize"
        :on-update:size="onSpiltSizeChange">
        <template #1>
          <div style="overflow: auto; min-height: 50vh; max-height: 100vh;">
            <n-list hoverable clickable class="glass-panel">
            <n-list-item v-for="row in data" v-bind:key="row.id" @click="() => clickRow(row)"
              :class="[mailItemClass(row), { 'mail-item-new': row.isNew }]">
                <template #prefix v-if="multiActionMode">
                  <n-checkbox v-model:checked="row.checked" />
                </template>
                <n-thing :title="row.subject">
                  <template #description>
                    <n-tag type="info">
                      ID: {{ row.id }}
                    </n-tag>
                    <n-tag type="info">
                      {{ utcToLocalDate(row.created_at, useUTCDate) }}
                    </n-tag>
                    <n-tag type="info">
                      <n-ellipsis style="max-width: 240px;">
                        {{ showEMailTo ? "FROM: " + row.source : row.source }}
                      </n-ellipsis>
                    </n-tag>
                    <n-tag v-if="showEMailTo" type="info">
                      <n-ellipsis style="max-width: 240px;">
                        TO: {{ row.address }}
                      </n-ellipsis>
                    </n-tag>
                    <AiExtractInfo :metadata="row.metadata" compact />
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
          </div>
        </template>
        <template #2>
          <div v-if="curMail" style="margin: 8px;">
            <n-flex justify="space-between">
              <n-button @click="prevMail" :disabled="!canGoPrevMail" text size="small">
                <template #icon>
                  <n-icon>
                    <ArrowBackIosNewFilled />
                  </n-icon>
                </template>
                {{ t('prevMail') }}
              </n-button>
              <n-button @click="nextMail" :disabled="!canGoNextMail" text size="small" icon-placement="right">
                <template #icon>
                  <n-icon>
                    <ArrowForwardIosFilled />
                  </n-icon>
                </template>
                {{ t('nextMail') }}
              </n-button>
            </n-flex>
          </div>
          <n-card :bordered="false" embedded v-if="curMail" class="mail-item glass-panel" :title="curMail.subject"
            style="overflow: auto; max-height: 100vh;">
            <MailContentRenderer :mail="curMail" :showEMailTo="showEMailTo"
              :enableUserDeleteEmail="enableUserDeleteEmail" :showReply="showReply" :showSaveS3="showSaveS3"
              :onDelete="deleteMail" :onReply="replyMail" :onForward="forwardMail" :onSaveToS3="saveToS3Proxy" />
          </n-card>
          <n-card :bordered="false" embedded class="mail-item glass-panel" v-else>
            <n-result status="info" :title="t('pleaseSelectMail')">
            </n-result>
          </n-card>
        </template>
      </n-split>
    </div>
    <div class="left" v-else>
      <n-space justify="space-around" align="center" :wrap="false" style="display: flex; align-items: center;">
        <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count" simple size="small" />
        <n-tooltip>
          <template #trigger>
            <n-icon :class="['auto-refresh-spinner', { 'is-active': mailLoading, 'is-manual': manualRefreshSpin }]">
              <AutorenewRound />
            </n-icon>
          </template>
          {{ t('refreshAfter', { msg: autoRefreshInterval }) }}
        </n-tooltip>
        <n-button @click="triggerManualRefresh" tertiary size="small" type="primary">
          {{ t('refresh') }}
        </n-button>
      </n-space>
      <div v-if="showFilterInput" style="padding: 0 10px; margin-top: 8px; margin-bottom: 10px;">
        <n-input v-model:value="localFilterKeyword" class="glass-input"
          :placeholder="t('keywordQueryTip')" size="small" clearable />
      </div>
      <div style="overflow: auto; height: 80vh;">
        <n-list hoverable clickable class="glass-panel">
          <n-list-item v-for="row in data" v-bind:key="row.id" @click="() => clickRow(row)"
            :class="[mailItemClass(row), { 'mail-item-new': row.isNew }]">
            <n-thing :title="row.subject">
              <template #description>
                <n-tag type="info">
                  ID: {{ row.id }}
                </n-tag>
                <n-tag type="info">
                  {{ utcToLocalDate(row.created_at, useUTCDate) }}
                </n-tag>
                <n-tag type="info">
                  <n-ellipsis style="max-width: 240px;">
                    {{ showEMailTo ? "FROM: " + row.source : row.source }}
                  </n-ellipsis>
                </n-tag>
                <n-tag v-if="showEMailTo" type="info">
                  <n-ellipsis style="max-width: 240px;">
                    TO: {{ row.address }}
                  </n-ellipsis>
                </n-tag>
                <AiExtractInfo :metadata="row.metadata" compact />
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </div>
      <n-drawer :show="drawerVisible" @update:show="handleDrawerUpdate" width="100%" placement="bottom"
        class="mail-drawer" :trap-focus="false" :block-scroll="false" :duration="160"
        style="height: 80vh;">
        <n-drawer-content :title="curMail ? curMail.subject : ''" closable>
          <n-card :bordered="false" embedded style="overflow: auto;" class="glass-panel">
            <MailContentRenderer :mail="curMail" :showEMailTo="showEMailTo"
              :enableUserDeleteEmail="enableUserDeleteEmail" :showReply="showReply" :showSaveS3="showSaveS3"
              :useUTCDate="useUTCDate" :onDelete="deleteMail" :onReply="replyMail" :onForward="forwardMail"
              :onSaveToS3="saveToS3Proxy" />
          </n-card>
        </n-drawer-content>
      </n-drawer>
    </div>
    <n-modal v-model:show="showMultiActionDownload" preset="dialog" :title="t('downloadMail')">
      <n-tag type="info">
        {{ multiActionDownloadZip.filename }}
      </n-tag>
      <n-button tag="a" target="_blank" tertiary type="info" size="small" :download="multiActionDownloadZip.filename"
        :href="multiActionDownloadZip.url">
        <n-icon :component="CloudDownloadRound" />
        {{ t('downloadMail') + " zip" }}
      </n-button>
    </n-modal>
    <n-modal v-model:show="showMultiActionDelete" preset="dialog" :title="t('delete') + t('success')"
      negative-text="OK">
      <n-space justify="center">
        <n-progress type="circle" status="error" :percentage="multiActionDeleteProgress.percentage">
          <span style="text-align: center">
            {{ multiActionDeleteProgress.tip }}
          </span>
        </n-progress>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.left {
  text-align: left;
}

.center {
  text-align: center;
}

.glass-panel {
  background: linear-gradient(135deg, var(--glass-highlight), var(--glass-bg));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-backdrop-blur));
  -webkit-backdrop-filter: blur(var(--glass-backdrop-blur));
  transform: translateZ(0);
  will-change: transform;
}

.mail-item-selected {
  background: var(--glass-selection-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-backdrop-blur));
  -webkit-backdrop-filter: blur(var(--glass-backdrop-blur));
  border-radius: 8px;
  transform: translateZ(0);
  will-change: transform;
}

.mail-item-selected :deep(.n-list-item__content),
.mail-item-selected :deep(.n-list-item__main) {
  background: var(--glass-selection-bg);
}

.mail-item-new {
  animation: mail-item-pop 1.2s ease;
}

.mail-item-new :deep(.n-list-item__content),
.mail-item-new :deep(.n-list-item__main) {
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.35), var(--glass-selection-bg));
}

@keyframes mail-item-pop {
  0% {
    transform: translateY(-6px);
    box-shadow: 0 18px 40px rgba(59, 130, 246, 0.25);
  }
  100% {
    transform: translateY(0);
    box-shadow: var(--glass-shadow);
  }
}

.glass-input {
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-backdrop-blur));
  -webkit-backdrop-filter: blur(var(--glass-backdrop-blur));
}

.glass-input :deep(.n-input__input),
.glass-input :deep(.n-input__placeholder),
.glass-input :deep(.n-input__suffix) {
  color: inherit;
}

.mail-drawer :deep(.n-drawer-content) {
  transform: translateZ(0);
  will-change: transform;
}

.mail-item {
  height: 100%;
}

.auto-refresh-spinner {
  font-size: 18px;
}

.auto-refresh-spinner.is-active {
  animation: spin 1.2s linear infinite;
}

.auto-refresh-spinner.is-manual {
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
