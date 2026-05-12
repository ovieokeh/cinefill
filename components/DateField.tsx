import { useState } from 'react';
import { Pressable, View, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  label?: string;
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DateField({ value, onChange, label = 'Watched' }: Props) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : new Date();

  function commit(d: Date) {
    onChange(toIsoDate(d));
  }

  return (
    <View>
      <Text variant="label" tone="secondary" style={{ marginBottom: t.spacing.xs }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${format(date, 'EEE, MMM d, yyyy')}. Tap to change.`}
        style={[
          styles.field,
          {
            backgroundColor: t.colors.bg.input,
            borderColor: t.colors.border.subtle,
            borderRadius: t.radii.md,
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.md,
          },
        ]}
      >
        <Text variant="body">{format(date, 'EEE, MMM d, yyyy')}</Text>
      </Pressable>

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setOpen(false);
            if (selected) commit(selected);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: t.colors.overlay, paddingHorizontal: t.spacing.xl }]}
            onPress={() => setOpen(false)}
          >
            <Pressable
              onPress={() => {}}
              style={[
                styles.sheet,
                {
                  backgroundColor: t.colors.bg.elevated,
                  borderRadius: t.radii.lg,
                  padding: t.spacing.lg,
                },
              ]}
            >
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                themeVariant="dark"
                maximumDate={new Date()}
                onChange={(_, selected) => {
                  if (selected) commit(selected);
                }}
              />
              <Pressable
                onPress={() => setOpen(false)}
                style={[
                  styles.doneBtn,
                  {
                    backgroundColor: t.colors.accent.base,
                    borderRadius: t.radii.md,
                    paddingVertical: t.spacing.sm,
                    marginTop: t.spacing.sm,
                  },
                ]}
              >
                <Text variant="bodyStrong" tone="inverted" style={styles.doneText}>
                  Done
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
  },
  sheet: {
    overflow: 'hidden',
  },
  doneBtn: {
    alignItems: 'center',
  },
  doneText: {
    textAlign: 'center',
  },
});
