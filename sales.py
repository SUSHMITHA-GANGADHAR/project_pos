from flask import Blueprint, request, jsonify
from functools import wraps
from utils import SecurityUtils
from models import Sale
from datetime import datetime

# ========== BLUEPRINT DEFINITION ==========
sales_bp = Blueprint('sales', __name__, url_prefix='/api/sales')

# Mock database
sales_db = {}

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

# ========== ROUTES ==========

@sales_bp.route('', methods=['GET'])
@require_auth
def get_sales():
    """Get all sales"""
    try:
        sales_list = []
        for sale in sales_db.values():
            sales_list.append({
                'id': sale.id,
                'customer_id': sale.customer_id,
                'total_amount': sale.total_amount,
                'payment_method': sale.payment_method,
                'status': sale.status,
                'items_count': len(sale.items),
                'created_at': sale.created_at
            })
        
        return jsonify(sales_list), 200
    
    except Exception as e:
        print(f"Get sales error: {e}")
        return jsonify({'error': str(e)}), 500


@sales_bp.route('', methods=['POST'])
@require_auth
def create_sale():
    """Create new sale"""
    try:
        data = request.get_json()
        
        if not data.get('items') or not isinstance(data['items'], list):
            return jsonify({'error': 'Items required'}), 400
        
        if len(data['items']) == 0:
            return jsonify({'error': 'At least one item required'}), 400
        
        # Calculate total
        total_amount = 0
        for item in data['items']:
            if 'quantity' not in item or 'price' not in item:
                return jsonify({'error': 'Invalid item format'}), 400
            
            try:
                quantity = int(item['quantity'])
                price = float(item['price'])
                
                if quantity <= 0 or price < 0:
                    return jsonify({'error': 'Invalid quantity or price'}), 400
                
                total_amount += quantity * price
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid item data'}), 400
        
        # Create sale
        sale = Sale(request.user_id, total_amount, data.get('payment_method', 'cash'))
        sale.items = data['items']
        
        sales_db[sale.id] = sale
        
        return jsonify({
            'message': 'Sale created successfully',
            'sale': {
                'id': sale.id,
                'total_amount': sale.total_amount,
                'items_count': len(sale.items),
                'status': sale.status,
                'created_at': sale.created_at
            }
        }), 201
    
    except Exception as e:
        print(f"Create sale error: {e}")
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/<sale_id>', methods=['GET'])
@require_auth
def get_sale(sale_id):
    """Get single sale"""
    try:
        if sale_id not in sales_db:
            return jsonify({'error': 'Sale not found'}), 404
        
        sale = sales_db[sale_id]
        
        return jsonify({
            'id': sale.id,
            'customer_id': sale.customer_id,
            'total_amount': sale.total_amount,
            'payment_method': sale.payment_method,
            'status': sale.status,
            'items': sale.items,
            'created_at': sale.created_at
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/<sale_id>', methods=['DELETE'])
@require_auth
def delete_sale(sale_id):
    """Delete sale"""
    try:
        if sale_id not in sales_db:
            return jsonify({'error': 'Sale not found'}), 404
        
        sale = sales_db[sale_id]
        
        if sale.status not in ['pending', 'cancelled']:
            return jsonify({'error': 'Cannot delete completed orders'}), 400
        
        del sales_db[sale_id]
        
        return jsonify({'message': 'Sale deleted'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({'message': 'Sales route is working!'}), 200