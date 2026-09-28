import pandas as pd
import sqlite3
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

class DataFetcher:
    """Class to fetch data from various databases"""
    
    def __init__(self, db_path: str = 'crop_prices.db'):
        self.db_path = db_path
    
    def get_connection(self) -> Optional[sqlite3.Connection]:
        """Get database connection"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            return conn
        except Exception as e:
            print(f"Error connecting to database: {e}")
            return None
    
    def fetch_prices(self, 
                    crop: Optional[str] = None,
                    district: Optional[str] = None,
                    market: Optional[str] = None,
                    limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch prices with filters"""
        conn = self.get_connection()
        if not conn:
            return []
        
        try:
            query = "SELECT * FROM crop_prices WHERE 1=1"
            params = []
            
            if crop:
                query += " AND crop = ?"
                params.append(crop)
            if district:
                query += " AND district = ?"
                params.append(district)
            if market:
                query += " AND market = ?"
                params.append(market)
            
            query += " ORDER BY date DESC LIMIT ?"
            params.append(limit)
            
            df = pd.read_sql_query(query, conn, params=params)
            return df.to_dict('records')
        
        finally:
            conn.close()
    
    def fetch_crops(self) -> List[str]:
        """Fetch list of unique crops"""
        conn = self.get_connection()
        if not conn:
            return []
        
        try:
            result = conn.execute("SELECT DISTINCT crop FROM crop_prices ORDER BY crop")
            return [row[0] for row in result.fetchall()]
        finally:
            conn.close()
    
    def fetch_districts(self) -> List[str]:
        """Fetch list of unique districts"""
        conn = self.get_connection()
        if not conn:
            return []
        
        try:
            result = conn.execute("SELECT DISTINCT district FROM crop_prices ORDER BY district")
            return [row[0] for row in result.fetchall()]
        finally:
            conn.close()
    
    def fetch_markets(self, district: Optional[str] = None) -> List[str]:
        """Fetch list of unique markets"""
        conn = self.get_connection()
        if not conn:
            return []
        
        try:
            if district:
                result = conn.execute(
                    "SELECT DISTINCT market FROM crop_prices WHERE district = ? ORDER BY market",
                    (district,)
                )
            else:
                result = conn.execute("SELECT DISTINCT market FROM crop_prices ORDER BY market")
            
            return [row[0] for row in result.fetchall()]
        finally:
            conn.close()
    
    def fetch_price_trends(self, 
                          crop: str,
                          district: Optional[str] = None,
                          days: int = 30) -> List[Dict[str, Any]]:
        """Fetch price trends for a crop"""
        conn = self.get_connection()
        if not conn:
            return []
        
        try:
            query = """
                SELECT date, AVG(price) as avg_price, COUNT(*) as record_count
                FROM crop_prices 
                WHERE crop = ? AND date >= date('now', ?)
            """
            params = [crop, f'-{days} days']
            
            if district:
                query += " AND district = ?"
                params.append(district)
            
            query += " GROUP BY date ORDER BY date"
            
            df = pd.read_sql_query(query, conn, params=params)
            return df.to_dict('records')
        
        finally:
            conn.close()
    
    def fetch_statistics(self) -> Dict[str, Any]:
        """Fetch overall statistics"""
        conn = self.get_connection()
        if not conn:
            return {}
        
        try:
            stats = {}
            
            # Basic counts
            stats['total_records'] = conn.execute("SELECT COUNT(*) FROM crop_prices").fetchone()[0]
            stats['total_crops'] = conn.execute("SELECT COUNT(DISTINCT crop) FROM crop_prices").fetchone()[0]
            stats['total_districts'] = conn.execute("SELECT COUNT(DISTINCT district) FROM crop_prices").fetchone()[0]
            stats['total_markets'] = conn.execute("SELECT COUNT(DISTINCT market) FROM crop_prices").fetchone()[0]
            
            # Date range
            date_range = conn.execute("SELECT MIN(date), MAX(date) FROM crop_prices").fetchone()
            stats['date_range'] = {
                'start': date_range[0],
                'end': date_range[1]
            }
            
            return stats
        
        finally:
            conn.close()

# Global fetcher instance
data_fetcher = DataFetcher()