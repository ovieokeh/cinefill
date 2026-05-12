import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import {
  Screen,
  Text,
  Button,
  PosterImage,
  MoviePosterRow,
  MoviePosterRowSkeleton,
  SkeletonPoster,
  SkeletonText,
} from '@/components';
import { useTheme } from '@/theme';
import { getPersonDetails, type PersonCredit, type PersonDetails } from '@/lib/tmdb';

const BIO_PREVIEW_CHARS = 250;

type DepartmentGroup = { department: string; items: PersonCredit[] };

function ageFromBirthday(birthday: string | null, deathday: string | null): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const end = deathday ? new Date(deathday) : new Date();
  if (Number.isNaN(end.getTime())) return null;
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function groupAndSortCredits(credits: PersonCredit[], priority: string): DepartmentGroup[] {
  const byDept = new Map<string, PersonCredit[]>();
  for (const c of credits) {
    const list = byDept.get(c.department) ?? [];
    list.push(c);
    byDept.set(c.department, list);
  }
  for (const list of byDept.values()) {
    list.sort((a, b) => {
      if (a.year && b.year) return b.year.localeCompare(a.year);
      if (a.year) return -1;
      if (b.year) return 1;
      return 0;
    });
  }
  const groups: DepartmentGroup[] = [];
  if (priority && byDept.has(priority)) {
    groups.push({ department: priority, items: byDept.get(priority)! });
    byDept.delete(priority);
  }
  const rest = [...byDept.entries()]
    .map(([department, items]) => ({ department, items }))
    .sort((a, b) => b.items.length - a.items.length);
  return [...groups, ...rest];
}

export default function PersonScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const validId = Number.isFinite(personId);

  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const p = await getPersonDetails(personId, controller.signal);
        if (!controller.signal.aborted) setPerson(p);
      } catch (e: unknown) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Failed to load person');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [personId, validId, retryKey]);

  const groups = useMemo(
    () => (person ? groupAndSortCredits(person.credits, person.knownForDepartment) : []),
    [person],
  );

  if (!validId) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <View style={styles.centered}>
            <Text variant="titleLg">Person not found</Text>
            <Button
              title="Go back"
              variant="ghost"
              onPress={() => router.back()}
              style={{ marginTop: t.spacing.lg }}
            />
          </View>
        </Screen>
      </>
    );
  }

  if (loading && !person) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen padded={false}>
          <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}>
            <View
              style={[
                styles.heroRow,
                { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.md },
              ]}
            >
              <SkeletonPoster size="lg" />
              <View style={[styles.heroMeta, { marginLeft: t.spacing.md }]}>
                <SkeletonText variant="displayMd" width="85%" />
                <View style={{ marginTop: t.spacing.xs }}>
                  <SkeletonText variant="caption" width="65%" />
                </View>
              </View>
            </View>

            <View style={{ marginTop: t.spacing.xxxl, paddingHorizontal: t.spacing.lg }}>
              <View style={{ marginBottom: t.spacing.md }}>
                <SkeletonText variant="label" width="25%" />
              </View>
              <SkeletonText variant="body" width="100%" />
              <View style={{ marginTop: t.spacing.xs }}>
                <SkeletonText variant="body" width="98%" />
              </View>
              <View style={{ marginTop: t.spacing.xs }}>
                <SkeletonText variant="body" width="92%" />
              </View>
              <View style={{ marginTop: t.spacing.xs }}>
                <SkeletonText variant="body" width="60%" />
              </View>
            </View>

            <View style={{ marginTop: t.spacing.xxxl }}>
              <View
                style={{ paddingHorizontal: t.spacing.lg, marginBottom: t.spacing.md }}
              >
                <SkeletonText variant="label" width="22%" />
              </View>
              <MoviePosterRowSkeleton />
            </View>
          </ScrollView>
        </Screen>
      </>
    );
  }

  if (error && !person) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <Screen>
          <View style={styles.centered}>
            <Text variant="titleLg">Couldn&apos;t load person</Text>
            <Text
              variant="caption"
              tone="muted"
              style={{ marginTop: t.spacing.xs, textAlign: 'center' }}
            >
              {error}
            </Text>
            <Button
              title="Retry"
              variant="ghost"
              onPress={() => setRetryKey((k) => k + 1)}
              style={{ marginTop: t.spacing.lg }}
            />
          </View>
        </Screen>
      </>
    );
  }

  if (!person) return null;

  const age = ageFromBirthday(person.birthday, person.deathday);
  const bio = person.biography.trim();
  const needsTruncation = bio.length > BIO_PREVIEW_CHARS;
  const showFullBio = bioExpanded || !needsTruncation;

  const headlinePieces: string[] = [];
  if (person.knownForDepartment) headlinePieces.push(person.knownForDepartment);
  if (age != null) {
    headlinePieces.push(person.deathday ? `Died at ${age}` : `${age} years old`);
  }
  if (person.placeOfBirth) headlinePieces.push(person.placeOfBirth);

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.xxxl * 2 }}>
          <View
            style={[
              styles.heroRow,
              {
                paddingHorizontal: t.spacing.lg,
                paddingTop: t.spacing.md,
              },
            ]}
          >
            <PosterImage posterPath={person.profilePath} size="lg" />
            <View style={[styles.heroMeta, { marginLeft: t.spacing.md }]}>
              <Text variant="displayMd" numberOfLines={3}>
                {person.name}
              </Text>
              {headlinePieces.length > 0 ? (
                <Text variant="caption" tone="muted" style={{ marginTop: t.spacing.xs }}>
                  {headlinePieces.join('  ·  ')}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={{
              marginTop: t.spacing.xxxl,
              paddingHorizontal: t.spacing.lg,
            }}
          >
            <Text
              variant="label"
              tone="muted"
              style={{
                marginBottom: t.spacing.md,
                textTransform: 'uppercase',
                letterSpacing: t.tracking.label,
              }}
            >
              Biography
            </Text>
            {bio.length === 0 ? (
              <Text variant="body" tone="muted">
                No biography on file.
              </Text>
            ) : (
              <>
                <Text variant="body">
                  {showFullBio ? bio : `${bio.slice(0, BIO_PREVIEW_CHARS).trimEnd()}…`}
                </Text>
                {needsTruncation ? (
                  <Pressable
                    onPress={() => setBioExpanded((v) => !v)}
                    hitSlop={t.spacing.sm}
                  >
                    <Text variant="label" tone="accent" style={{ marginTop: t.spacing.sm }}>
                      {bioExpanded ? 'Show less' : 'Read more'}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          {groups.map((g) => (
            <View key={g.department}>
              <Text
                variant="label"
                tone="muted"
                style={{
                  marginTop: t.spacing.xxxl,
                  marginBottom: t.spacing.md,
                  paddingHorizontal: t.spacing.lg,
                  textTransform: 'uppercase',
                  letterSpacing: t.tracking.label,
                }}
              >
                {g.department}
              </Text>
              <MoviePosterRow items={g.items} />
            </View>
          ))}
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start' },
  heroMeta: { flex: 1, minWidth: 0 },
});
