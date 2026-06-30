<script setup lang="ts">
import LayoutScreen from '@/pages/components/LayoutScreen.vue';
import Header from '@/pages/components/Header.vue';
import Status from './components/Status.vue';
import Scene from './Scene.vue';
import { onMounted, provide, ref } from 'vue';
import { injectContextKey } from './context';
import signals from 'signals';
import equips from '../data/steelmill';
import Temperature from './components/Temperature.vue';
import Pressure from './components/Pressure.vue';
import Statistic from './components/Statistic.vue';
import Ai from './components/Ai.vue';

type Equipment = {
  name: string;
  key: string;
  [key: string]: unknown;
};

type MetricType = 'temperature' | 'pressure' | 'statistic';

type MetricConfig = {
  index: number;
  type?: MetricType;
  title?: string;
  max?: number;
};

type PanelItem = {
  equip: Equipment;
  metrics: MetricConfig[];
};

type PanelGroup = {
  className?: string;
  items: PanelItem[];
};

const sceneRef = ref();
const showMask = ref(true);
const showSider = ref(true);
const status = ref<any[]>([]);
const maxPanelWidth = ref('100%');
const events: {
  focusTo: signals.Signal<any>;
  warn: signals.Signal<any>;
} = {
  focusTo: new signals.Signal(),
  warn: new signals.Signal(),
};

const equipmentList = [
  equips.Bianqieji,
  equips.Cuzhaji,
  equips.Dianhulu,
  equips.Duanqieji,
  equips.Gaolu,
  equips.Jiarelu,
  equips.Jingzhaji,
  equips.Lianzhu,
  equips.Panjuanji,
  equips.Tieshuiguan,
  equips.Zhengpingji,
  equips.Zhongzhaji,
  equips.Zhuanlu,
  equips.Zhuzhaji,
] as Equipment[];

const metric = (index: number, options: Omit<MetricConfig, 'index'> = {}): MetricConfig => ({
  index,
  ...options,
});

const leftGroups: PanelGroup[] = [
  {
    items: [
      {
        equip: equips.Gaolu as Equipment,
        metrics: [
          metric(0, { type: 'temperature', title: '温度', max: 2000 }),
          metric(1, { type: 'pressure', title: '压力', max: 10 }),
        ],
      },
    ],
  },
  {
    className: 'col-2',
    items: [
      { equip: equips.Jiarelu as Equipment, metrics: [metric(0, { type: 'temperature', title: '温度', max: 2000 })] },
      { equip: equips.Tieshuiguan as Equipment, metrics: [metric(0, { title: '容量', max: 10 })] },
    ],
  },
  {
    className: 'col-2',
    items: [
      { equip: equips.Zhuanlu as Equipment, metrics: [metric(0, { title: '利用系数', max: 2000 })] },
      { equip: equips.Dianhulu as Equipment, metrics: [metric(0, { title: '利用系数', max: 10 })] },
    ],
  },
  {
    className: 'col-2',
    items: [
      { equip: equips.Lianzhu as Equipment, metrics: [metric(0, { title: '作业率', max: 2000 })] },
      { equip: equips.Zhuzhaji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 2000 })] },
    ],
  },
];

const rightGroups: PanelGroup[] = [
  {
    className: 'col-2',
    items: [
      { equip: equips.Cuzhaji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 10 })] },
      { equip: equips.Zhongzhaji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 2000 })] },
    ],
  },
  {
    className: 'col-2',
    items: [
      { equip: equips.Jingzhaji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 10 })] },
      { equip: equips.Duanqieji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 2000 })] },
    ],
  },
  {
    className: 'col-2',
    items: [
      { equip: equips.Bianqieji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 10 })] },
      { equip: equips.Zhengpingji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 2000 })] },
    ],
  },
  {
    className: 'col-2',
    items: [{ equip: equips.Panjuanji as Equipment, metrics: [metric(0, { title: '平均小时产量', max: 10 })] }],
  },
];

const metricEntries = (equip: Equipment) => Object.entries(equip).filter(([key]) => key !== 'name' && key !== 'key');

const readMetric = (equip: Equipment, config: MetricConfig) => {
  const [title, rawMetric] = metricEntries(equip)[config.index] || [];
  const current = (rawMetric || {}) as { value?: string | number; unit?: string };
  // console.log(current);
  return {
    title: config.title || title || '',
    max: config.max || 2000,
    value: Number(current.value || 0),
    unit: current.unit || '',
  };
};

const metricComponent = (type: MetricType = 'statistic') => {
  if (type === 'temperature') return Temperature;
  if (type === 'pressure') return Pressure;
  return Statistic;
};

onMounted(() => {
  status.value = equipmentList;
});

const handleClickStatus = (name: string) => {
  dispatchFocus(name);
};

const dispatchFocus = (focusKey: string) => {
  events.focusTo.dispatch(focusKey);
};

provide(injectContextKey, {
  events,
  status,
});
</script>

<template>
  <LayoutScreen>
    <template #header>
      <Header>
        <div class="title">钢铁厂数字孪生平台</div>
      </Header>
    </template>

    <template #left v-if="showSider">
      <div class="panels" :style="{ '--max-panel-width': maxPanelWidth }">
        <div
          v-for="(group, groupIndex) in leftGroups"
          :key="`left-${groupIndex}`"
          class="status-list"
          :class="group.className"
        >
          <Status
            v-for="item in group.items"
            :key="item.equip.key"
            status="success"
            :frame="true"
            :title="item.equip.name"
            @click="handleClickStatus(item.equip.key)"
          >
            <div class="status-grid" :class="{ 'col-2': item.metrics.length > 1 }">
              <div v-for="metricConfig in item.metrics" :key="metricConfig.index">
                <component
                  :is="metricComponent(metricConfig.type)"
                  :title="readMetric(item.equip, metricConfig).title"
                  :max="readMetric(item.equip, metricConfig).max"
                  :value="readMetric(item.equip, metricConfig).value"
                >
                  <template #suffix>{{ readMetric(item.equip, metricConfig).unit }}</template>
                </component>
              </div>
            </div>
          </Status>
        </div>
      </div>
    </template>

    <template #right v-if="showSider">
      <div class="panels" :style="{ '--max-panel-width': maxPanelWidth }">
        <div
          v-for="(group, groupIndex) in rightGroups"
          :key="`right-${groupIndex}`"
          class="status-list"
          :class="group.className"
        >
          <Status
            v-for="item in group.items"
            :key="item.equip.key"
            status="success"
            :frame="true"
            :title="item.equip.name"
            @click="handleClickStatus(item.equip.key)"
          >
            <div class="status-grid" :class="{ 'col-2': item.metrics.length > 1 }">
              <div v-for="metricConfig in item.metrics" :key="metricConfig.index">
                <component
                  :is="metricComponent(metricConfig.type)"
                  :title="readMetric(item.equip, metricConfig).title"
                  :max="readMetric(item.equip, metricConfig).max"
                  :value="readMetric(item.equip, metricConfig).value"
                >
                  <template #suffix>{{ readMetric(item.equip, metricConfig).unit }}</template>
                </component>
              </div>
            </div>
          </Status>
        </div>
      </div>
    </template>

    <template #main>
      <Scene ref="sceneRef" />
      <div v-if="showMask" class="mask"></div>
      <Ai :equipment-list="equipmentList" :metric-entries="metricEntries" />
    </template>
  </LayoutScreen>
</template>

<style lang="scss" scoped>
.panels {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  width: var(--max-panel-width, 100%);
  max-width: var(--max-panel-width, 100%);
  // grid-gap: 8px;
  height: 100%;
  overflow: hidden;
  overflow: auto;
  pointer-events: none;
  scrollbar-width: none;
  > * {
    pointer-events: initial;
  }
  &::-webkit-scrollbar {
    display: none;
  }
}
.title {
  background: linear-gradient(181deg, #8fe1ff 0%, #dffaff 99.31640625%);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.status-list {
  display: grid;
  grid-auto-rows: 1fr;
  grid-gap: 0.1rem;
  align-items: center;
  &.col-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  &.row-3 {
    grid-template-rows: repeat(3, 1fr);
  }
  &.col-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  &.row-2 {
    grid-template-rows: repeat(2, 1fr);
  }
  &.grid-auto-flow {
    grid-auto-flow: row dense;
  }
  .col-span-2 {
    grid-column-start: 1;
    grid-column-end: 2;
  }
}
.status-grid {
  display: flex;
  flex: 1;
  // gap: 4px;
  align-items: center;
  justify-content: space-around;
  text-align: center;
  & > div {
    flex: 1;
    // padding: 4px;
    width: 50%;
  }
  &.col-3 {
    > div {
      width: 33%;
    }
  }
  // display: grid;
  // grid-auto-rows: 1fr;
  // grid-gap: 0.15rem;
  // &.col-3 {
  //   grid-template-columns: repeat(3, 1fr);
  // }
  // &.row-3 {
  //   grid-template-rows: repeat(3, 1fr);
  // }
  // &.col-2 {
  //   grid-template-columns: repeat(2, 1fr);
  // }
  // &.row-2 {
  //   grid-template-rows: repeat(2, 1fr);
  // }
}

.mask {
  --color-bg: #121328cc;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image:
    radial-gradient(circle at center, transparent 0%, rgba(18, 19, 40, 0.1) 70%, rgba(18, 19, 40, 0.8) 100%),
    linear-gradient(
      to right,
      rgba(18, 19, 40, 0.8) 0%,
      rgba(18, 19, 40, 0.5) 10%,
      rgba(18, 19, 40, 0.1) 20%,
      rgba(18, 19, 40, 0) 50%,
      rgba(18, 19, 40, 0.1) 80%,
      rgba(18, 19, 40, 0.5) 90%,
      rgba(18, 19, 40, 0.8) 100%
    );
  background-repeat: no-repeat;
  box-shadow: 0 0 0 9999em var(--color-bg);
}
</style>
