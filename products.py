from flask import Blueprint, request, jsonify
from functools import wraps
from utils import SecurityUtils
from models import Product, Inventory

# ========== BLUEPRINT DEFINITION ==========
products_bp = Blueprint('products', __name__, url_prefix='/api/products')

# Mock databases
products_db = {}
inventory_db = {}

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

@products_bp.route('', methods=['GET'])
@require_auth
def get_products():
    """Get all products"""
    try:
        products_list = [
            {
                'id': p.id,
                'product_name': p.product_name,
                'category': p.category,
                'cost_price': p.cost_price,
                'selling_price': p.selling_price,
                'status': p.status
            }
            for p in products_db.values()
        ]
        return jsonify(products_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@products_bp.route('', methods=['POST'])
@require_auth
@require_admin
def create_product():
    """Create new product (Admin only)"""
    try:
        data = request.get_json()
        
        # Validation
        if not data.get('product_name'):
            return jsonify({'error': 'Product name required'}), 400
        
        if not data.get('cost_price') or not data.get('selling_price'):
            return jsonify({'error': 'Cost and selling price required'}), 400
        
        try:
            cost = float(data['cost_price'])
            selling = float(data['selling_price'])
            
            if cost < 0 or selling < 0:
                return jsonify({'error': 'Prices cannot be negative'}), 400
            
            if selling < cost:
                return jsonify({'error': 'Selling price must be >= cost price'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid price format'}), 400
        
        # Create product
        product = Product(
            data['product_name'],
            data.get('category', 'Uncategorized'),
            cost,
            selling,
            data.get('supplier_id')
        )
        
        products_db[product.id] = product
        
        # Create inventory record
        inventory = Inventory(product.id, 0, 10)
        inventory_db[product.id] = inventory
        
        return jsonify({
            'message': 'Product created successfully',
            'product': {
                'id': product.id,
                'product_name': product.product_name,
                'category': product.category,
                'cost_price': product.cost_price,
                'selling_price': product.selling_price
            }
        }), 201
    
    except Exception as e:
        print(f"Create product error: {e}")
        return jsonify({'error': str(e)}), 500


@products_bp.route('/<product_id>', methods=['GET'])
@require_auth
def get_product(product_id):
    """Get single product"""
    try:
        if product_id not in products_db:
            return jsonify({'error': 'Product not found'}), 404
        
        product = products_db[product_id]
        return jsonify({
            'id': product.id,
            'product_name': product.product_name,
            'category': product.category,
            'cost_price': product.cost_price,
            'selling_price': product.selling_price,
            'status': product.status
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@products_bp.route('/<product_id>', methods=['PUT'])
@require_auth
@require_admin
def update_product(product_id):
    """Update product (Admin only)"""
    try:
        if product_id not in products_db:
            return jsonify({'error': 'Product not found'}), 404
        
        data = request.get_json()
        product = products_db[product_id]
        
        if 'product_name' in data:
            product.product_name = data['product_name']
        if 'category' in data:
            product.category = data['category']
        if 'cost_price' in data:
            product.cost_price = float(data['cost_price'])
        if 'selling_price' in data:
            product.selling_price = float(data['selling_price'])
        
        return jsonify({'message': 'Product updated', 'product_id': product_id}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@products_bp.route('/<product_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete_product(product_id):
    """Delete product (Admin only)"""
    try:
        if product_id not in products_db:
            return jsonify({'error': 'Product not found'}), 404
        
        del products_db[product_id]
        if product_id in inventory_db:
            del inventory_db[product_id]
        
        return jsonify({'message': 'Product deleted'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@products_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({'message': 'Products route is working!'}), 200