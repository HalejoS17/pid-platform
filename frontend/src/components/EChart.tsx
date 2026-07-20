import type {
  EChartsOption,
} from 'echarts';

import ReactECharts
  from 'echarts-for-react';

interface EChartProps {
  option: EChartsOption;
  height?: number;
}

export function EChart({
  option,
  height = 320,
}: EChartProps) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate

      style={{
        width: '100%',
        height,
      }}

      opts={{
        renderer: 'canvas',
      }}
    />
  );
}