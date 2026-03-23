from flask import Blueprint, request, jsonify
from functools import wraps
from utils import SecurityUtils
from models import User
from datetime import datetime, timedelta
import uuid

# ========== BLUEPRINT DEFINITION ==========
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Mock database (replace with real database)
users_db = {}

# ========== DECORATORS ==========
def limiter_limit(limit_string):
    """Simple rate limiter decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ========== ROUTES ==========

@auth_bp.route('/register', methods=['POST'])
@limiter_limit("5 per hour")
def register():
    """Register new user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract and validate inputs
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        phone = data.get('phone', '').strip()
        full_name = data.get('full_name', '').strip()
        role = data.get('role', 'customer')
        
        # Basic validation
        if not all([email, password, phone, full_name]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if not SecurityUtils.validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        if not SecurityUtils.validate_phone(phone):
            return jsonify({'error': 'Invalid phone format'}), 400
        
        if not SecurityUtils.validate_password(password):
            return jsonify({
                'error': 'Password must be 8+ chars with uppercase, number, and special char'
            }), 400
        
        if len(full_name) < 2:
            return jsonify({'error': 'Name too short'}), 400
        
        # Check if user exists
        if email in users_db:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Create user
        user = User(email, password, full_name, phone, role)
        user.password = SecurityUtils.hash_password(password)
        users_db[email] = user
        
        # Generate token
        token = SecurityUtils.generate_token(
            user.id, user.email, user.role,
            request.app.config['SECRET_KEY']
        )
        
        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role
            }
        }), 201
    
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter_limit("10 per hour")
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
        
        # Check user exists
        if email not in users_db:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user = users_db[email]
        
        # Verify password
        if not SecurityUtils.verify_password(password, user.password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if user.status != 'active':
            return jsonify({'error': 'Account inactive'}), 403
        
        # Generate token
        token = SecurityUtils.generate_token(
            user.id, user.email, user.role,
            request.app.config['SECRET_KEY']
        )
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role
            }
        }), 200
    
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter_limit("3 per hour")
def forgot_password():
    """Initiate password reset"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email or not SecurityUtils.validate_email(email):
            return jsonify({'error': 'Invalid email'}), 400
        
        # In production, send reset email here
        if email in users_db:
            print(f"[PASSWORD RESET] Reset link would be sent to: {email}")
        
        # Always return success to prevent email enumeration
        return jsonify({
            'message': 'If email exists, reset link will be sent'
        }), 200
    
    except Exception as e:
        print(f"Forgot password error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        
        payload = SecurityUtils.verify_token(token, request.app.config['SECRET_KEY'])
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        return jsonify({'valid': True, 'payload': payload}), 200
    
    except Exception as e:
        print(f"Token verification error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({'message': 'Auth route is working!'}), 200