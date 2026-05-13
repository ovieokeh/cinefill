import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';
import { CinefillMark } from './CinefillMark';
import { PositionScale } from './PositionScale';
import { BarFill } from './BarFill';
import { StarRow } from './StarRow';

export type TasteMetricKey =
  | 'genreLead'
  | 'era'
  | 'runtime'
  | 'recency'
  | 'reach'
  | 'loyalty'
  | 'style';

type ScaleConfig =
  | { kind: 'position'; ratio: number | null; leftLabel: string; rightLabel: string }
  | { kind: 'fill'; ratio: number; leftLabel: string; rightLabel: string }
  | { kind: 'stars'; median: number; spreadHint?: string }
  | { kind: 'none' };

export type TasteMetricSheetArgs = {
  metric: TasteMetricKey;
  /** Section label shown in the eyebrow (e.g. "Loyalty"). */
  label: string;
  /** Big italic hero value (e.g. "Story-driven viewer", "11%", "120m"). */
  heroValue: string;
  /** Full readout — no `numberOfLines` cap. */
  readout: string;
  /** 1–2 sentences answering "what is this measuring, denominator of what?". */
  explainer: string;
  /** Scale visualization shown below the explainer. */
  scale: ScaleConfig;
  /** Optional confidence caveat shown beneath the scale. */
  confidenceNote?: string;
  /** Optional explicit CTA — keeps the existing navigation discoverable. */
  cta?: {
    label: string;
    onPress: () => void;
  };
};

export type TasteMetricSheetHandle = {
  present: (args: TasteMetricSheetArgs) => void;
  dismiss: () => void;
};

export const TasteMetricSheet = forwardRef<TasteMetricSheetHandle>(
  function TasteMetricSheet(_, ref) {
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const modalRef = useRef<BottomSheetModal>(null);
    const [args, setArgs] = useState<TasteMetricSheetArgs | null>(null);

    useImperativeHandle(ref, () => ({
      present: (next) => {
        setArgs(next);
        modalRef.current?.present();
      },
      dismiss: () => {
        modalRef.current?.dismiss();
      },
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={modalRef}
        enablePanDownToClose
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: t.colors.bg.elevated }}
        handleIndicatorStyle={{ backgroundColor: t.colors.border.strong }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.sm,
            paddingBottom: insets.bottom + t.spacing.xl,
          }}
        >
          {args ? <SheetBody args={args} onCtaPress={() => modalRef.current?.dismiss()} /> : null}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

function SheetBody({
  args,
  onCtaPress,
}: {
  args: TasteMetricSheetArgs;
  onCtaPress: () => void;
}) {
  const t = useTheme();
  return (
    <View>
      {/* Eyebrow row — mark, label, hairline, rated-count if relevant */}
      <View style={[styles.eyebrowRow, { gap: t.spacing.sm }]}>
        <CinefillMark size={t.spacing.lg} />
        <Text
          variant="label"
          tone="secondary"
          style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
        >
          {args.label}
        </Text>
        <View
          style={{
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: t.colors.border.strong,
            marginHorizontal: t.spacing.xs,
          }}
        />
      </View>

      {/* Hero value — matches the card's italic display treatment */}
      <Text
        variant="displayItalicLg"
        tone="primary"
        style={{ marginTop: t.spacing.lg }}
      >
        {args.heroValue}
      </Text>

      {/* Full readout */}
      {args.readout ? (
        <Text
          variant="body"
          tone="secondary"
          style={{ marginTop: t.spacing.sm, fontStyle: 'italic' }}
        >
          — {args.readout}
        </Text>
      ) : null}

      {/* Explainer paragraph */}
      <Text
        variant="body"
        tone="secondary"
        style={{ marginTop: t.spacing.lg }}
      >
        {args.explainer}
      </Text>

      {/* Scale visualization with axis labels */}
      <ScaleBlock scale={args.scale} />

      {/* Confidence note */}
      {args.confidenceNote ? (
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: t.spacing.md }}
        >
          {args.confidenceNote}
        </Text>
      ) : null}

      {/* Explicit CTA — keeps navigation discoverable */}
      {args.cta ? (
        <Button
          title={args.cta.label}
          variant="ghost"
          onPress={() => {
            onCtaPress();
            // Defer navigation so the dismiss animation plays first
            requestAnimationFrame(args.cta!.onPress);
          }}
          style={{ marginTop: t.spacing.lg }}
        />
      ) : null}
    </View>
  );
}

function ScaleBlock({ scale }: { scale: ScaleConfig }) {
  const t = useTheme();
  if (scale.kind === 'none') return null;

  if (scale.kind === 'stars') {
    return (
      <View style={{ marginTop: t.spacing.lg, gap: t.spacing.xs }}>
        <StarRow value={scale.median} size={t.spacing.lg} />
        {scale.spreadHint ? (
          <Text
            variant="caption"
            tone="muted"
            style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
          >
            {scale.spreadHint}
          </Text>
        ) : null}
      </View>
    );
  }

  // position | fill — share the same labelled-track layout
  return (
    <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
      {scale.kind === 'position' ? (
        <PositionScale ratio={scale.ratio} size="lg" />
      ) : (
        <BarFill ratio={scale.ratio} size="lg" />
      )}
      <View style={styles.axisRow}>
        <Text
          variant="caption"
          tone="muted"
          style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
        >
          {scale.leftLabel}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          style={{ textTransform: 'uppercase', letterSpacing: t.tracking.label }}
        >
          {scale.rightLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: 'row', alignItems: 'center' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
