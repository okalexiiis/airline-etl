import {
  pgTable,
  text,
  integer,
  serial,
  bigserial,
  real,
  boolean,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';

// ── Star Schema ───────────────────────────────────────────────────────────────

export const dimAirline = pgTable('DimAirline', {
  airline_id: serial('airline_id').primaryKey(),
  airline_name: text('airline_name').notNull().unique(),
});

export const dimPlatform = pgTable('DimPlatform', {
  platform_id: serial('platform_id').primaryKey(),
  platform_name: text('platform_name').notNull().unique(),
});

export const dimTopic = pgTable('DimTopic', {
  topic_id: serial('topic_id').primaryKey(),
  topic_name: text('topic_name').notNull().unique(),
});

export const dimDate = pgTable('DimDate', {
  date_id: serial('date_id').primaryKey(),
  full_date: date('full_date').notNull().unique(),
  day: integer('day').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  day_of_week: text('day_of_week').notNull(),
});

export const factSentimentAnalysis = pgTable('FactSentimentAnalysis', {
  fact_id: bigserial('fact_id', { mode: 'number' }).primaryKey(),
  tweet_text: text('tweet_text').notNull(),
  tweet_text_clean: text('tweet_text_clean').notNull(),
  sentiment: text('sentiment').notNull(),
  confidence: real('confidence').notNull(),
  date_id: integer('date_id').references(() => dimDate.date_id, { onDelete: 'cascade' }),
  airline_id: integer('airline_id').references(() => dimAirline.airline_id, { onDelete: 'cascade' }),
  platform_id: integer('platform_id').references(() => dimPlatform.platform_id, { onDelete: 'cascade' }),
  topic_id: integer('topic_id').references(() => dimTopic.topic_id, { onDelete: 'cascade' }),
}, (t) => ({
  dateIdx: index('idx_fact_date').on(t.date_id),
  airlineIdx: index('idx_fact_airline').on(t.airline_id),
  platformIdx: index('idx_fact_platform').on(t.platform_id),
  topicIdx: index('idx_fact_topic').on(t.topic_id),
  sentimentIdx: index('idx_fact_sentiment').on(t.sentiment),
  dateSentimentIdx: index('idx_fact_date_sentiment').on(t.date_id, t.sentiment),
}));

// ── Auth Tables (better-auth) ─────────────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: boolean('emailVerified').default(false),
  image: text('image'),
  role: text('role').default('Viewer'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});
