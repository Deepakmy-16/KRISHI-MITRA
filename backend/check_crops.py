import sqlite3
import pandas as pd
from typing import List, Dict, Any

def check_database_structure(db_path: str) -> Dict[str, Any]:
    """Check the structure of the database"""
    try:
        conn = sqlite3.connect(db_path)
        
        # Get table info
        tables = pd.read_sql_query(
            "SELECT name FROM sqlite_master WHERE type='table'", 
            conn
        )
        
        result = {
            'database': db_path,
            'tables': [],
            'record_counts': {},
            'table_schemas': {}
        }
        
        for table_name in tables['name']:
            # Get record count
            count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
            result['record_counts'][table_name] = count
            
            # Get schema
            schema = pd.read_sql_query(f"PRAGMA table_info({table_name})", conn)
            result['table_schemas'][table_name] = schema.to_dict('records')
            
            # Get sample data
            sample = pd.read_sql_query(f"SELECT * FROM {table_name} LIMIT 5", conn)
            result['tables'].append({
                'name': table_name,
                'sample_data': sample.to_dict('records')
            })
        
        conn.close()
        return result
    
    except Exception as e:
        return {'database': db_path, 'error': str(e)}

def analyze_crop_data(db_path: str) -> Dict[str, Any]:
    """Analyze crop data in the database"""
    try:
        conn = sqlite3.connect(db_path)
        
        analysis = {
            'crops': {},
            'districts': {},
            'date_range': {},
            'price_stats': {}
        }
        
        # Get unique crops and counts
        crops = pd.read_sql_query(
            "SELECT crop, COUNT(*) as count FROM crop_prices GROUP BY crop ORDER BY count DESC", 
            conn
        )
        analysis['crops'] = crops.to_dict('records')
        
        # Get districts and counts
        districts = pd.read_sql_query(
            "SELECT district, COUNT(*) as count FROM crop_prices GROUP BY district ORDER BY count DESC", 
            conn
        )
        analysis['districts'] = districts.to_dict('records')
        
        # Get date range
        date_range = pd.read_sql_query(
            "SELECT MIN(date) as start_date, MAX(date) as end_date FROM crop_prices", 
            conn
        )
        analysis['date_range'] = date_range.to_dict('records')[0]
        
        # Get price statistics
        price_stats = pd.read_sql_query(
            "SELECT MIN(price) as min_price, MAX(price) as max_price, AVG(price) as avg_price FROM crop_prices", 
            conn
        )
        analysis['price_stats'] = price_stats.to_dict('records')[0]
        
        conn.close()
        return analysis
    
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    databases = [
        'crop_prices.db',
        'full_daily_prices.db', 
        'crop_data.db',
        'crops.db'
    ]
    
    print("🔍 Checking Database Structure...")
    print("=" * 50)
    
    for db in databases:
        print(f"\n📁 Database: {db}")
        print("-" * 30)
        
        try:
            # Check structure
            structure = check_database_structure(db)
            
            if 'error' in structure:
                print(f"❌ Error: {structure['error']}")
                continue
            
            print(f"📊 Tables found: {len(structure['tables'])}")
            
            for table in structure['tables']:
                print(f"   └─ {table['name']}: {structure['record_counts'][table['name']]} records")
                
                # Show columns for crop_prices table
                if table['name'] == 'crop_prices':
                    schema = structure['table_schemas']['crop_prices']
                    columns = [col['name'] for col in schema]
                    print(f"      Columns: {', '.join(columns)}")
            
            # Analyze data if it's crop_prices.db
            if db == 'crop_prices.db':
                analysis = analyze_crop_data(db)
                if 'error' not in analysis:
                    print(f"\n📈 Data Analysis:")
                    print(f"   📅 Date Range: {analysis['date_range']['start_date']} to {analysis['date_range']['end_date']}")
                    print(f"   💰 Price Range: ₹{analysis['price_stats']['min_price']} - ₹{analysis['price_stats']['max_price']}")
                    print(f"   🌱 Total Crops: {len(analysis['crops'])}")
                    print(f"   🏛️ Total Districts: {len(analysis['districts'])}")
                    
                    print(f"\n   Top 5 Crops:")
                    for crop in analysis['crops'][:5]:
                        print(f"      {crop['crop']}: {crop['count']} records")
        
        except Exception as e:
            print(f"❌ Error analyzing {db}: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Database check completed!")