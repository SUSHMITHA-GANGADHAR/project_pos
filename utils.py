import hashlib
import re
import secrets
import bcrypt
import jwt
from datetime import datetime, timedelta
import os

class SecurityUtils:
    """Security utilities for the application"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        if not isinstance(password, str):
            password = str(password)
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hash_value: str) -> bool:
        """Verify password against hash"""
        try:
            if not isinstance(password, str):
                password = str(password)
            if not isinstance(hash_value, str):
                hash_value = str(hash_value)
            return bcrypt.checkpw(password.encode('utf-8'), hash_value.encode('utf-8'))
        except Exception as e:
            print(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def hash_sensitive_data(data: str) -> str:
        """Hash sensitive data like email, phone"""
        salt = os.getenv('HASH_SALT', 'pos_system_salt')
        return hashlib.sha256(f"{data}{salt}".encode()).hexdigest()
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email)) and len(email) <= 255
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number"""
        pattern = r'^[0-9]{10,15}$'
        cleaned = phone.replace('-', '').replace(' ', '')
        return bool(re.match(pattern, cleaned))
    
    @staticmethod
    def validate_password(password: str) -> bool:
        """
        Validate password strength
        Minimum 8 characters, 1 uppercase, 1 number, 1 special character
        """
        if len(password) < 8:
            return False
        pattern = r'^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
        return bool(re.match(pattern, password))
    
    @staticmethod
    def validate_input(data: str, input_type: str) -> bool:
        """Generic input validation"""
        validators = {
            'email': SecurityUtils.validate_email,
            'phone': SecurityUtils.validate_phone,
            'password': SecurityUtils.validate_password
        }
        
        validator = validators.get(input_type)
        if validator:
            return validator(data)
        return True
    
    @staticmethod
    def generate_token(user_id: str, email: str, role: str, secret_key: str) -> str:
        """Generate JWT token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=24),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    @staticmethod
    def verify_token(token: str, secret_key: str):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

class ValidationError(Exception):
    """Custom validation error"""
    pass