import {
  useMemo,
  useState,
} from 'react'
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import Svg, {
  Circle,
  Line,
  Polyline,
  Text as SvgText,
} from 'react-native-svg'

import { AppText } from '@/components/ui/AppText'
import {
  useAppTheme,
} from '@/theme/ThemeProvider'

export type ProgressChartPoint = {
  label: string
  value: number
}

type ProgressChartProps = {
  data: ProgressChartPoint[]
  suffix: string
}

const CHART_HEIGHT = 150
const HORIZONTAL_PADDING = 18
const TOP_PADDING = 16
const BOTTOM_PADDING = 28

export function ProgressChart({
  data,
  suffix,
}: ProgressChartProps) {
  const { theme } = useAppTheme()
  const [width, setWidth] = useState(0)

  const chart = useMemo(() => {
    if (width === 0 || data.length < 2) {
      return null
    }

    const values = data.map(
      (point) => point.value,
    )

    const rawMinimum = Math.min(...values)
    const rawMaximum = Math.max(...values)

    const padding =
      rawMinimum === rawMaximum
        ? Math.max(rawMaximum * 0.1, 1)
        : (rawMaximum - rawMinimum) *
          0.15

    const minimum = Math.max(
      0,
      rawMinimum - padding,
    )

    const maximum =
      rawMaximum + padding

    const range = Math.max(
      maximum - minimum,
      1,
    )

    const drawableWidth =
      width - HORIZONTAL_PADDING * 2

    const drawableHeight =
      CHART_HEIGHT -
      TOP_PADDING -
      BOTTOM_PADDING

    const points = data.map(
      (point, index) => {
        const x =
          HORIZONTAL_PADDING +
          (index / (data.length - 1)) *
            drawableWidth

        const y =
          TOP_PADDING +
          ((maximum - point.value) /
            range) *
            drawableHeight

        return {
          ...point,
          x,
          y,
        }
      },
    )

    return {
      points,
      polyline: points
        .map(
          (point) =>
            `${point.x},${point.y}`,
        )
        .join(' '),
    }
  }, [data, width])

  function handleLayout(
    event: LayoutChangeEvent,
  ) {
    setWidth(
      event.nativeEvent.layout.width,
    )
  }

  return (
    <View
      onLayout={handleLayout}
      style={styles.container}
    >
      {chart && (
        <>
          <View style={styles.currentValue}>
            <AppText
              tone="primary"
              variant="caption"
              style={styles.currentLabel}
            >
              LATEST
            </AppText>

            <AppText
              tone="primary"
              variant="label"
            >
              {data.at(-1)?.value ?? 0}{' '}
              {suffix}
            </AppText>
          </View>

          <Svg
            height={CHART_HEIGHT}
            width={width}
          >
            {[0, 0.5, 1].map(
              (position) => {
                const y =
                  TOP_PADDING +
                  position *
                    (CHART_HEIGHT -
                      TOP_PADDING -
                      BOTTOM_PADDING)

                return (
                  <Line
                    key={position}
                    stroke={
                      theme.colors.border
                    }
                    strokeWidth={1}
                    x1={
                      HORIZONTAL_PADDING
                    }
                    x2={
                      width -
                      HORIZONTAL_PADDING
                    }
                    y1={y}
                    y2={y}
                  />
                )
              },
            )}

            <Polyline
              fill="none"
              points={chart.polyline}
              stroke={theme.colors.primary}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
            />

            {chart.points.map(
              (point, index) => (
                <Circle
                  key={`${point.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  fill={
                    theme.colors.surface
                  }
                  r={5}
                  stroke={
                    theme.colors.primary
                  }
                  strokeWidth={3}
                />
              ),
            )}

            {chart.points.map(
              (point, index) => (
                <SvgText
                  key={`label-${point.label}-${index}`}
                  fill={
                    theme.colors.textSubtle
                  }
                  fontSize={10}
                  textAnchor="middle"
                  x={point.x}
                  y={CHART_HEIGHT - 6}
                >
                  {point.label}
                </SvgText>
              ),
            )}
          </Svg>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: CHART_HEIGHT,
    position: 'relative',
    width: '100%',
  },
  currentValue: {
    alignItems: 'flex-end',
    position: 'absolute',
    right: 18,
    top: 10,
    zIndex: 1,
  },
  currentLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
})
