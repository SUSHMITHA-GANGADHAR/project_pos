from flask import Blueprint, request, jsonify
from functools import wraps
from utils import SecurityUtils
from datetime import datetime, timedelta

# ========== BLUEPRINT DEFINITION ==========
analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

# ========== DECORATORS ==========
def require_auth(f):
    """Authentication decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Missing authorization token'}), 401
        
        payload = SecurityUtils.verify_token(token, request.app.config['SECRET_KEY'])
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.user_id = payload['user_id']
        request.user_role = payload.get('role', 'customer')
        
        return f(*args, **kwargs)
    
    return decorated_function

def require_admin(f):
    """Admin role decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'user_role') or request.user_role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function

# ========== ROUTES ==========

@analytics_bp.route('/dashboard', methods=['GET'])
@require_auth
@require_admin
def dashboard():
    """Get dashboard analytics"""
    try:
        return jsonify({
            'total_sales': 0,
            'total_orders': 0,
            'total_products': 0,
            'low_stock_count': 0,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/sales-trend', methods=['GET'])
@require_auth
@require_admin
def sales_trend():
    """Get sales trend"""
    try:
        trend = {}
        for i in range(7):
            date = (datetime.now() - timedelta(days=i)).date()
            trend[date.isoformat()] = 0
        
        return jsonify({'data': trend, 'currency': 'INR'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/profit-loss', methods=['GET'])
@require_auth
@require_admin
def profit_loss():
    """Get profit/loss report"""
    try:
        today = datetime.now().date()
        
        return jsonify({
            'date': today.isoformat(),
            'revenue': 0,
            'cost': 0,
            'profit': 0,
            'profit_margin': 0
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({'message': 'Analytics route is working!'}), 200