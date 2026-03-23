import os
import secrets
from datetime import datetime, timedelta
from functools import wraps
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

load_dotenv()

# ========== FLASK APP ==========
app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))

CORS(app, supports_credentials=True)

# ========== MOCK DATABASE ==========
users_db = {}
suppliers_db = {}
products_db = {}
orders_db = {}
sales_db = {}

# ========== SECURITY FUNCTIONS ==========
import bcrypt
import jwt

def hash_password(password):
    """Hash password"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, hash_value):
    """Verify password"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hash_value.encode('utf-8'))
    except:
        return False

def generate_token(user_id, email, role):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    """Verify JWT token"""
    try:
        return jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except:
        return None

# ========== DECORATORS ==========
def require_auth(f):
    """Require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        request.user_id = payload['user_id']
        request.user_role = payload['role']
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    """Require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'user_role') or request.user_role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

# ========== SECURITY HEADERS ==========
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# ========== SERVE STATIC FILES ==========
@app.route('/')
def index():
    """Serve index.html"""
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)"""
    try:
        return send_from_directory('../frontend', path)
    except:
        return send_from_directory('../frontend', 'index.html')

# ========== API ROUTES ==========
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

# ========== AUTH ROUTES ==========
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        full_name = data.get('full_name', '').strip()
        phone = data.get('phone', '').strip()
        role = data.get('role', 'customer')
        
        if not all([email, password, full_name, phone]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if email in users_db:
            return jsonify({'error': 'Email already registered'}), 409
        
        user_id = 'user_' + secrets.token_hex(8)
        users_db[email] = {
            'id': user_id,
            'email': email,
            'password': hash_password(password),
            'full_name': full_name,
            'phone': phone,
            'role': role,
            'status': 'active'
        }
        
        token = generate_token(user_id, email, role)
        
        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user_id,
                'email': email,
                'full_name': full_name,
                'role': role
            }
        }), 201
    
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        if email not in users_db:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user = users_db[email]
        
        if not verify_password(password, user['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if user['status'] != 'active':
            return jsonify({'error': 'Account inactive'}), 403
        
        token = generate_token(user['id'], user['email'], user['role'])
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role']
            }
        }), 200
    
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Forgot password"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email required'}), 400
        
        return jsonify({'message': 'If email exists, reset link will be sent'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== PRODUCTS ROUTES ==========
@app.route('/api/products', methods=['GET'])
@require_auth
def get_products():
    """Get all products"""
    try:
        products_list = list(products_db.values())
        return jsonify(products_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['POST'])
@require_auth
@require_admin
def create_product():
    """Create product"""
    try:
        data = request.get_json()
        
        if not data.get('product_name'):
            return jsonify({'error': 'Product name required'}), 400
        
        if not data.get('cost_price') or not data.get('selling_price'):
            return jsonify({'error': 'Cost and selling price required'}), 400
        
        product_id = 'prod_' + secrets.token_hex(8)
        products_db[product_id] = {
            'id': product_id,
            'product_name': data['product_name'],
            'category': data.get('category', 'Uncategorized'),
            'cost_price': float(data['cost_price']),
            'selling_price': float(data['selling_price']),
            'status': 'active'
        }
        
        return jsonify({
            'message': 'Product created',
            'product': products_db[product_id]
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<product_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete_product(product_id):
    """Delete product"""
    try:
        if product_id not in products_db:
            return jsonify({'error': 'Product not found'}), 404
        
        del products_db[product_id]
        return jsonify({'message': 'Product deleted'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== SUPPLIERS ROUTES ==========
@app.route('/api/suppliers', methods=['GET'])
@require_auth
def get_suppliers():
    """Get all suppliers"""
    try:
        return jsonify(list(suppliers_db.values())), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/suppliers', methods=['POST'])
@require_auth
@require_admin
def create_supplier():
    """Create supplier"""
    try:
        data = request.get_json()
        
        if not data.get('supplier_name'):
            return jsonify({'error': 'Supplier name required'}), 400
        
        supplier_id = 'supp_' + secrets.token_hex(8)
        suppliers_db[supplier_id] = {
            'id': supplier_id,
            'supplier_name': data['supplier_name'],
            'contact_person': data.get('contact_person'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'city': data.get('city'),
            'status': 'active'
        }
        
        return jsonify({
            'message': 'Supplier created',
            'supplier': suppliers_db[supplier_id]
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== SALES ROUTES ==========
@app.route('/api/sales', methods=['GET'])
@require_auth
def get_sales():
    """Get all sales"""
    try:
        return jsonify(list(sales_db.values())), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sales', methods=['POST'])
@require_auth
def create_sale():
    """Create sale"""
    try:
        data = request.get_json()
        
        if not data.get('items'):
            return jsonify({'error': 'Items required'}), 400
        
        total_amount = sum(item.get('quantity', 0) * item.get('price', 0) for item in data['items'])
        
        sale_id = 'sale_' + secrets.token_hex(8)
        sales_db[sale_id] = {
            'id': sale_id,
            'customer_id': request.user_id,
            'total_amount': total_amount,
            'payment_method': data.get('payment_method', 'cash'),
            'status': 'pending',
            'items': data.get('items', []),
            'created_at': datetime.now().isoformat()
        }
        
        return jsonify({
            'message': 'Sale created',
            'sale': sales_db[sale_id]
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ANALYTICS ROUTES ==========
@app.route('/api/analytics/dashboard', methods=['GET'])
@require_auth
@require_admin
def analytics_dashboard():
    """Dashboard analytics"""
    try:
        total_sales = sum(sale['total_amount'] for sale in sales_db.values())
        
        return jsonify({
            'total_sales': total_sales,
            'total_products': len(products_db),
            'total_suppliers': len(suppliers_db),
            'total_orders': len(sales_db)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ERROR HANDLERS ==========
@app.errorhandler(404)
def not_found(e):
    return send_from_directory('../frontend', 'index.html')

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

# ========== RUN APP ==========
if __name__ == '__main__':
    print("\n" + "="*70)
    print("🚀 RestauPOS API Server Starting...")
    print("="*70)
    print(f"🌐 Frontend: http://localhost:5000")
    print(f"🔗 API: http://localhost:5000/api/health")
    print(f"📊 Dashboard: http://localhost:5000 (after login)")
    print("="*70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)