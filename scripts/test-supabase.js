const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabase() {
  console.log('\n🔍 Testing Supabase Connection...\n');

  // 1. Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Environment Variables:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('\n❌ Supabase credentials not configured!\n');
    return;
  }

  console.log('\n📊 Supabase URL:', supabaseUrl);

  // 2. Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('\n✅ Supabase client created\n');

  // 3. Test connection by querying the merkle_distributions table
  console.log('Testing database connection...\n');

  try {
    const { data, error, count } = await supabase
      .from('merkle_distributions')
      .select('*', { count: 'exact', head: false })
      .order('id', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ Database Error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);

      if (error.code === 'PGRST116') {
        console.log('\n⚠️ Table "merkle_distributions" does not exist!');
        console.log('   You need to create the table in Supabase dashboard.\n');
      } else if (error.code === '42P01') {
        console.log('\n⚠️ Table "merkle_distributions" does not exist!');
        console.log('   You need to create the table in Supabase dashboard.\n');
      }
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log(`✅ Found ${count || 0} distribution(s) in database\n`);

    if (data && data.length > 0) {
      console.log('Recent distributions:');
      data.forEach((dist, index) => {
        console.log(`  ${index + 1}. ID: ${dist.id}, Root: ${dist.merkle_root?.substring(0, 10)}...`);
      });
    } else {
      console.log('⚠️ No distributions found in database yet.');
      console.log('   This is normal if you haven\'t executed any distributions.\n');
    }

    // 4. Test table structure
    console.log('\n🔍 Checking table structure...\n');

    const { data: sampleRow, error: sampleError } = await supabase
      .from('merkle_distributions')
      .select('*')
      .limit(1)
      .single();

    if (sampleError && sampleError.code !== 'PGRST116') {
      // PGRST116 means no rows, which is fine
      if (sampleError.code !== 'PGRST116' && sampleError.code !== '42P01') {
        console.log('⚠️ Could not fetch sample row:', sampleError.message);
      }
    }

    if (sampleRow) {
      console.log('Table columns found:');
      Object.keys(sampleRow).forEach(key => {
        console.log(`  - ${key}: ${typeof sampleRow[key]}`);
      });
    } else {
      console.log('Expected columns:');
      console.log('  - id (number)');
      console.log('  - merkle_root (string)');
      console.log('  - total_rewards (string)');
      console.log('  - claims (object/JSONB)');
      console.log('  - metadata (object/JSONB)');
      console.log('  - created_at (timestamp)');
    }

  } catch (err) {
    console.log('\n❌ Unexpected Error:', err.message);
    console.log('   Stack:', err.stack);
  }

  console.log('\n✅ Supabase test completed!\n');
}

testSupabase().catch(console.error);
