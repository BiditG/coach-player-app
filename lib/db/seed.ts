import { eq } from 'drizzle-orm';
import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { createAdminClient } from '@/lib/supabase/admin';

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  // Guard: this seed creates a demo owner with well-known credentials. Running
  // it against a production database would create a publicly-known owner account.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to run the seed with NODE_ENV=production: it creates a demo ' +
        'owner (test@test.com / admin123). Run it only against a dev database.'
    );
  }

  const email = 'test@test.com';
  const password = 'admin123';

  // Creates the Supabase Auth user. The `handle_new_user` DB trigger
  // (lib/db/migrations/0001_supabase_auth_identity.sql) inserts the
  // matching `public.users` row synchronously — we never insert into
  // `users` from application code.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create seed user: ${error?.message}`);
  }

  const userId = data.user.id;

  // The trigger defaults role to 'member'; the seed user should be an owner.
  const [user] = await db
    .update(users)
    .set({ role: 'owner' })
    .where(eq(users.id, userId))
    .returning();

  console.log('Initial user created.');

  const [team] = await db
    .insert(teams)
    .values({
      name: 'Test Team',
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
