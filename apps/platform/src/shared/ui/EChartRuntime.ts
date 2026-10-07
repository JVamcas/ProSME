import { use as registerCharts } from "echarts/core";
import {
  CustomChart,
  FunnelChart,
  LineChart,
  MapChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  AriaComponent,
  DataZoomComponent,
  GeoComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  ToolboxComponent,
  VisualMapComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

registerCharts([
  CustomChart,
  FunnelChart,
  LineChart,
  MapChart,
  PieChart,
  ScatterChart,
  AriaComponent,
  DataZoomComponent,
  GeoComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  ToolboxComponent,
  VisualMapComponent,
  SVGRenderer,
]);

export { init, parseGeoJSON, registerMap } from "echarts/core";
export type { EChartsCoreOption, EChartsType } from "echarts/core";
export type { EChartsOption } from "echarts";
