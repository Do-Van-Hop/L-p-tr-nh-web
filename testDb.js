require('dotenv').config();
const { testConnection, pool } = require('./config/database');

async function testDatabase() {
    console.log('🔄 Testing database connection...');
    
    try {
        // Test kết nối cơ bản
        await testConnection();
        console.log('✅ Database connection successful!');
        
        // Test query đơn giản
        const [rows] = await pool.execute('SELECT 1 as test_value');
        console.log('✅ Simple query test:', rows[0].test_value);
        
        // Kiểm tra bảng products
        try {
            const [tables] = await pool.execute("SHOW TABLES LIKE 'products'");
            if (tables.length > 0) {
                console.log('✅ Products table exists');
                
                // Kiểm tra cấu trúc bảng products
                const [structure] = await pool.execute('DESCRIBE products');
                console.log('📋 Products table structure:');
                structure.forEach(col => {
                    console.log(`   - ${col.Field} (${col.Type})`);
                });
                
                // Kiểm tra dữ liệu
                const [products] = await pool.execute('SELECT COUNT(*) as count FROM products');
                console.log(`📊 Total products: ${products[0].count}`);
                
                if (products[0].count > 0) {
                    const [sample] = await pool.execute('SELECT * FROM products LIMIT 1');
                    console.log('📝 Sample product:', sample[0]);
                }
            } else {
                console.log('❌ Products table does not exist');
                console.log('💡 You need to create the products table');
            }
        } catch (tableError) {
            console.log('❌ Error checking products table:', tableError.message);
        }
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.log('💡 Please check your database configuration in .env file');
    }
    
    process.exit();
}

testDatabase();