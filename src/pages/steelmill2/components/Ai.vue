<script setup lang="ts">
import { analyzeDevices, type AiAnalyzeResult } from '@/api/ai';
import { ref } from 'vue';

type Equipment = {
  name: string;
  key: string;
  [key: string]: unknown;
};

const props = defineProps<{
  equipmentList: Equipment[];
  metricEntries: (equip: Equipment) => [string, unknown][];
}>();

const aiLoading = ref(false);
const aiError = ref('');
const aiResult = ref<AiAnalyzeResult>();

const levelText: Record<string, string> = {
  idle: '待分析',
  normal: '正常',
  warning: '预警',
  danger: '危险',
};

const fold = ref('展开');
const bottom = ref(false);
const foldFun = () => {
  fold.value = fold.value === '展开' ? '收起' : '展开';
  bottom.value = !bottom.value;
  console.log(fold, bottom);
};

const buildAiPayload = () => ({
  factory: '钢铁厂数字孪生平台',
  devices: props.equipmentList.map((equip) => ({
    name: equip.name,
    key: equip.key,
    metrics: props.metricEntries(equip).map(([name, rawMetric]) => {
      const metric = rawMetric as { value?: string | number; unit?: string };

      return {
        name,
        value: metric.value || 0,
        unit: metric.unit || '',
      };
    }),
  })),
});

const handleAnalyzeDevices = async () => {
  aiLoading.value = true;
  aiError.value = '';

  try {
    aiResult.value = await analyzeDevices(buildAiPayload());
    console.log(aiResult);
  } catch (error) {
    aiError.value = error instanceof Error ? error.message : 'AI 分析请求失败';
  } finally {
    aiLoading.value = false;
  }
};
</script>

<template>
  <section class="ai-panel" aria-label="AI 监测助手">
    <header class="ai-panel__header">
      <div class="ai-panel__heading">
        <div class="ai-panel__eyebrow">AI Monitor</div>
        <div class="ai-panel__title-row">
          <h2 class="ai-panel__title">AI 监测助手</h2>
          <button class="ai-panel__button_open" @click="foldFun">{{ fold }}</button>
        </div>
        <p class="ai-panel__subtitle">设备状态智能分析</p>
      </div>
      <span class="ai-panel__badge" :class="`is-${aiResult?.level || 'idle'}`">
        {{ levelText[aiResult?.level || 'idle'] || aiResult?.level }}
      </span>
    </header>

    <div class="ai-panel__body" v-if="bottom">
      <button class="ai-panel__button" type="button" :disabled="aiLoading" @click="handleAnalyzeDevices">
        <span class="ai-panel__button-dot"></span>
        <span>{{ aiLoading ? '分析中...' : '分析当前状态' }}</span>
      </button>

      <div v-if="aiError" class="ai-panel__error">{{ aiError }}</div>

      <div v-if="aiResult" class="ai-panel__content">
        <div class="ai-panel__section">
          <div class="ai-panel__label">状态结论</div>
          <p class="ai-panel__summary">{{ aiResult.summary }}</p>
        </div>

        <div v-if="aiResult.risks?.length" class="ai-panel__section">
          <div class="ai-panel__label">风险提示</div>
          <ul class="ai-panel__list">
            <li v-for="risk in aiResult.risks" :key="risk">{{ risk }}</li>
          </ul>
        </div>

        <div v-if="aiResult.suggestions?.length" class="ai-panel__section">
          <div class="ai-panel__label">处置建议</div>
          <ul class="ai-panel__list">
            <li v-for="suggestion in aiResult.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="ai-panel__empty">点击按钮后，AI 将基于当前设备温度、压力和产量数据生成状态诊断。</div>
    </div>
  </section>
</template>

<style lang="css" scoped>
.ai-panel {
  position: absolute;
  right: 0.24rem;
  bottom: 0.24rem;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  width: min(4.2rem, 31vw);
  max-height: calc(100vh - 1.4rem);
  padding: 0.18rem;
  overflow: hidden;
  color: #dffaff;
  pointer-events: initial;
  background:
    linear-gradient(180deg, rgba(17, 43, 76, 0.94), rgba(7, 17, 33, 0.9)),
    radial-gradient(circle at 20% 0%, rgba(103, 214, 255, 0.24), transparent 36%);
  border: 1px solid rgba(104, 220, 255, 0.48);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 46px rgba(0, 12, 32, 0.42),
    0 0 28px rgba(28, 172, 255, 0.16);
  backdrop-filter: blur(12px);
}

.ai-panel::before {
  position: absolute;
  top: 0;
  right: 0.2rem;
  left: 0.2rem;
  height: 2px;
  content: '';
  background: linear-gradient(90deg, transparent, #8fe1ff, transparent);
}

.ai-panel__header {
  display: flex;
  gap: 0.14rem;
  align-items: flex-start;
  justify-content: space-between;
}

.ai-panel__heading {
  min-width: 0;
}

.ai-panel__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.12rem;
}

.ai-panel__eyebrow {
  margin-bottom: 0.02rem;
  font-size: 0.1rem;
  line-height: 1;
  color: rgba(143, 225, 255, 0.72);
  text-transform: uppercase;
}

.ai-panel__title {
  margin: 0;
  font-size: 0.18rem;
  font-weight: 700;
  line-height: 1.2;
  color: #f3fdff;
}

.ai-panel__subtitle {
  margin: 0.06rem 0 0;
  font-size: 0.12rem;
  line-height: 1.3;
  color: rgba(223, 250, 255, 0.68);
}

.ai-panel__badge {
  flex: 0 0 auto;
  min-width: 0.56rem;
  padding: 0.04rem 0.08rem;
  font-size: 0.12rem;
  line-height: 1.2;
  color: #8fe1ff;
  text-align: center;
  white-space: nowrap;
  border: 1px solid rgba(143, 225, 255, 0.42);
  border-radius: 4px;
  background: rgba(143, 225, 255, 0.08);
}

.ai-panel__badge.is-normal {
  color: #7cffb2;
  border-color: rgba(124, 255, 178, 0.48);
  background: rgba(39, 178, 112, 0.12);
}

.ai-panel__badge.is-warning {
  color: #ffd166;
  border-color: rgba(255, 209, 102, 0.52);
  background: rgba(255, 209, 102, 0.12);
}

.ai-panel__badge.is-danger {
  color: #ff8585;
  border-color: rgba(255, 107, 107, 0.54);
  background: rgba(255, 107, 107, 0.13);
}

.ai-panel__button_open {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-height: 0.38rem;
  padding: 0 0.14rem;
  font-size: 0.14rem;
  font-weight: 700;
  line-height: 1;
  color: #04182b;
  white-space: nowrap;
  cursor: pointer;
  background: linear-gradient(180deg, #a8edff, #5acbff);
  border: 0;
  border-radius: 5px;
  box-shadow: 0 8px 18px rgba(37, 183, 255, 0.22);
}

.ai-panel__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0.38rem;
  padding: 0 0.14rem;
  font-size: 0.14rem;
  font-weight: 700;
  line-height: 1;
  color: #04182b;
  white-space: nowrap;
  cursor: pointer;
  background: linear-gradient(180deg, #a8edff, #5acbff);
  border: 0;
  border-radius: 5px;
  box-shadow: 0 8px 18px rgba(37, 183, 255, 0.22);
}

.ai-panel__button:hover:not(:disabled) {
  filter: brightness(1.06);
}

.ai-panel__button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.ai-panel__button-dot {
  width: 0.07rem;
  height: 0.07rem;
  margin-right: 0.08rem;
  background: #07335b;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(7, 51, 91, 0.6);
}

.ai-panel__content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-height: 0;
  overflow: auto;
  font-size: 0.13rem;
  line-height: 1.55;
  scrollbar-width: thin;
}

.ai-panel__section {
  padding: 0.1rem;
  background: rgba(4, 18, 36, 0.44);
  border: 1px solid rgba(143, 225, 255, 0.16);
  border-radius: 5px;
}

.ai-panel__summary {
  margin: 0.06rem 0 0;
  color: rgba(239, 253, 255, 0.92);
}

.ai-panel__label {
  font-size: 0.12rem;
  font-weight: 700;
  line-height: 1;
  color: #8fe1ff;
}

.ai-panel__list {
  padding-left: 0.18rem;
  margin: 0.08rem 0 0;
  color: rgba(239, 253, 255, 0.9);
}

.ai-panel__list li + li {
  margin-top: 0.05rem;
}

.ai-panel__empty,
.ai-panel__error {
  padding: 0.1rem;
  font-size: 0.12rem;
  line-height: 1.5;
  border-radius: 5px;
}

.ai-panel__empty {
  color: rgba(223, 250, 255, 0.62);
  background: rgba(143, 225, 255, 0.06);
  border: 1px dashed rgba(143, 225, 255, 0.18);
}

.ai-panel__error {
  color: #ffaaaa;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.28);
}

.ai-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0;
  padding: 0;
}
</style>
