import {
  parseCsv,
  parseDiaryCsv,
  parseReviewsCsv,
  parseWatchedCsv,
  parseWatchlistCsv,
} from '@/lib/letterboxd-csv';

describe('parseCsv', () => {
  test('empty input returns []', () => {
    expect(parseCsv('')).toEqual([]);
  });

  test('header-only returns []', () => {
    expect(parseCsv('Name,Year')).toEqual([]);
  });

  test('unquoted simple row', () => {
    expect(parseCsv('A,B\n1,2')).toEqual([{ A: '1', B: '2' }]);
  });

  test('quoted field with comma in title', () => {
    expect(parseCsv('Name\n"Kill Bill, Vol. 2"')).toEqual([
      { Name: 'Kill Bill, Vol. 2' },
    ]);
  });

  test('quoted field with escaped doubled quotes', () => {
    expect(parseCsv('Name\n"She said ""hi"""')).toEqual([
      { Name: 'She said "hi"' },
    ]);
  });

  test('CRLF row terminator parses', () => {
    expect(parseCsv('A,B\r\n1,2\r\n3,4')).toEqual([
      { A: '1', B: '2' },
      { A: '3', B: '4' },
    ]);
  });

  test('trailing newline is tolerated', () => {
    expect(parseCsv('A,B\n1,2\n')).toEqual([{ A: '1', B: '2' }]);
  });

  test('missing optional columns surface as empty strings', () => {
    expect(parseCsv('A,B,C\n1,2')).toEqual([{ A: '1', B: '2', C: '' }]);
  });

  test('quoted field with embedded newline', () => {
    expect(parseCsv('Note\n"line1\nline2"')).toEqual([
      { Note: 'line1\nline2' },
    ]);
  });

  test('blank lines between rows are dropped', () => {
    expect(parseCsv('A\n1\n\n2')).toEqual([{ A: '1' }, { A: '2' }]);
  });
});

describe('parseDiaryCsv', () => {
  test('falls back to Date when Watched Date is missing', () => {
    const csv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2025-11-25,Inception,2010,https://boxd.it/bwjm5r,4.5,,,';
    expect(parseDiaryCsv(csv)).toEqual([
      {
        date: '2025-11-25',
        name: 'Inception',
        year: '2010',
        uri: 'https://boxd.it/bwjm5r',
        rating: 4.5,
        watchedDate: '2025-11-25',
      },
    ]);
  });

  test('uses Watched Date when present', () => {
    const csv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2025-11-25,Inception,2010,https://boxd.it/bwjm5r,4.5,,,2012-06-06';
    expect(parseDiaryCsv(csv)[0].watchedDate).toBe('2012-06-06');
  });

  test('blank Rating becomes 0; non-numeric Year becomes null', () => {
    const csv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2025-11-25,Some Film,??,https://boxd.it/x,,,,2024-01-01';
    expect(parseDiaryCsv(csv)[0]).toMatchObject({ rating: 0, year: null });
  });

  test('handles a quoted name with a comma', () => {
    const csv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n' +
      '2025-11-25,"Kill Bill, Vol. 2",2004,https://boxd.it/bPenxn,5,,,2010-04-24';
    expect(parseDiaryCsv(csv)[0].name).toBe('Kill Bill, Vol. 2');
  });
});

describe('parseReviewsCsv', () => {
  test('preserves the Review column', () => {
    const csv =
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date\n' +
      '2025-09-14,Weapons,2025,https://boxd.it/b3BQkh,3,,Wild ending,,2025-08-21';
    expect(parseReviewsCsv(csv)[0]).toMatchObject({
      name: 'Weapons',
      rating: 3,
      review: 'Wild ending',
      watchedDate: '2025-08-21',
    });
  });
});

describe('parseWatchedCsv / parseWatchlistCsv', () => {
  test('parses the 4-column shape', () => {
    const csv =
      'Date,Name,Year,Letterboxd URI\n' +
      '2025-09-14,Dream Scenario,2023,https://boxd.it/v2h0';
    expect(parseWatchedCsv(csv)).toEqual([
      {
        date: '2025-09-14',
        name: 'Dream Scenario',
        year: '2023',
        uri: 'https://boxd.it/v2h0',
      },
    ]);
    expect(parseWatchlistCsv(csv)).toEqual([
      {
        date: '2025-09-14',
        name: 'Dream Scenario',
        year: '2023',
        uri: 'https://boxd.it/v2h0',
      },
    ]);
  });
});
