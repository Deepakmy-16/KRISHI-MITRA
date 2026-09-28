from flask import Blueprint, request, jsonify
import pandas as pd
from fetcher import data_fetcher
from models import CropPrice, PriceStats, SearchFilters

# Create Blueprint for API routes
api_bp = Blueprint('api', __name__)

@api_bp.route('/prices', methods=['GET'])
def api_get_prices():
    """API endpoint for getting prices"""
    try:
        crop = request.args.get('crop')
        district = request.args.get('district')
        market = request.args.get('market')
        limit = int(request.args.get('limit', 100))
        
        prices = data_fetcher.fetch_prices(
            crop=crop,
            district=district,
            market=market,
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'count': len(prices),
            'data': prices
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/crops', methods=['GET'])
def api_get_crops():
    """API endpoint for getting crops"""
    try:
        crops = data_fetcher.fetch_crops()
        return jsonify({
            'success': True,
            'crops': crops
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/districts', methods=['GET'])
def api_get_districts():
    """API endpoint for getting districts"""
    try:
        districts = data_fetcher.fetch_districts()
        return jsonify({
            'success': True,
            'districts': districts
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/markets', methods=['GET'])
def api_get_markets():
    """API endpoint for getting markets"""
    try:
        district = request.args.get('district')
        markets = data_fetcher.fetch_markets(district=district)
        return jsonify({
            'success': True,
            'markets': markets
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/stats', methods=['GET'])
def api_get_stats():
    """API endpoint for getting statistics"""
    try:
        stats = data_fetcher.fetch_statistics()
        return jsonify({
            'success': True,
            'statistics': stats
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/price-trends', methods=['GET'])
def api_get_price_trends():
    """API endpoint for price trends"""
    try:
        crop = request.args.get('crop')
        district = request.args.get('district')
        days = int(request.args.get('days', 30))
        
        if not crop:
            return jsonify({'success': False, 'error': 'Crop parameter is required'}), 400
        
        trends = data_fetcher.fetch_price_trends(
            crop=crop,
            district=district,
            days=days
        )
        
        return jsonify({
            'success': True,
            'crop': crop,
            'district': district,
            'trends': trends
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500