from datetime import datetime
from typing import Optional, List, Dict, Any

class CropPrice:
    """Model for crop price data"""
    
    def __init__(self, 
                 state: str,
                 district: str,
                 market: str,
                 crop: str,
                 variety: str,
                 grade: str,
                 date: str,
                 price: float,
                 record_id: Optional[int] = None):
        
        self.id = record_id
        self.state = state
        self.district = district
        self.market = market
        self.crop = crop
        self.variety = variety
        self.grade = grade
        self.date = date
        self.price = price
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'state': self.state,
            'district': self.district,
            'market': self.market,
            'crop': self.crop,
            'variety': self.variety,
            'grade': self.grade,
            'date': self.date,
            'price': self.price
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CropPrice':
        """Create model from dictionary"""
        return cls(
            record_id=data.get('id'),
            state=data.get('state', ''),
            district=data.get('district', ''),
            market=data.get('market', ''),
            crop=data.get('crop', ''),
            variety=data.get('variety', ''),
            grade=data.get('grade', ''),
            date=data.get('date', ''),
            price=data.get('price', 0.0)
        )

class PriceStats:
    """Model for price statistics"""
    
    def __init__(self,
                 crop: str,
                 district: str,
                 market: str,
                 average_price: float,
                 min_price: float,
                 max_price: float,
                 record_count: int,
                 date_range: Dict[str, str]):
        
        self.crop = crop
        self.district = district
        self.market = market
        self.average_price = average_price
        self.min_price = min_price
        self.max_price = max_price
        self.record_count = record_count
        self.date_range = date_range
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'crop': self.crop,
            'district': self.district,
            'market': self.market,
            'average_price': round(self.average_price, 2),
            'min_price': round(self.min_price, 2),
            'max_price': round(self.max_price, 2),
            'record_count': self.record_count,
            'date_range': self.date_range
        }

class SearchFilters:
    """Model for search filters"""
    
    def __init__(self,
                 crop: Optional[str] = None,
                 district: Optional[str] = None,
                 market: Optional[str] = None,
                 variety: Optional[str] = None,
                 start_date: Optional[str] = None,
                 end_date: Optional[str] = None,
                 min_price: Optional[float] = None,
                 max_price: Optional[float] = None):
        
        self.crop = crop
        self.district = district
        self.market = market
        self.variety = variety
        self.start_date = start_date
        self.end_date = end_date
        self.min_price = min_price
        self.max_price = max_price
    
    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}