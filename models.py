from datetime import datetime
import uuid

class User:
    """User model"""
    def __init__(self, email, password, full_name, phone, role='customer'):
        self.id = str(uuid.uuid4())
        self.email = email
        self.password = password
        self.full_name = full_name
        self.phone = phone
        self.role = role  # 'admin' or 'customer'
        self.status = 'active'
        self.created_at = datetime.now().isoformat()

class Product:
    """Product model"""
    def __init__(self, product_name, category, cost_price, selling_price, supplier_id=None):
        self.id = str(uuid.uuid4())
        self.product_name = product_name
        self.category = category
        self.cost_price = float(cost_price)
        self.selling_price = float(selling_price)
        self.supplier_id = supplier_id
        self.status = 'active'
        self.created_at = datetime.now().isoformat()

class Supplier:
    """Supplier model"""
    def __init__(self, supplier_name, contact_person, city, email=None, phone=None):
        self.id = str(uuid.uuid4())
        self.supplier_name = supplier_name
        self.contact_person = contact_person
        self.city = city
        self.email = email
        self.phone = phone
        self.status = 'active'
        self.created_at = datetime.now().isoformat()

class PurchaseOrder:
    """Purchase Order model"""
    def __init__(self, product_id, supplier_id, quantity, unit_cost):
        self.id = str(uuid.uuid4())
        self.product_id = product_id
        self.supplier_id = supplier_id
        self.quantity = int(quantity)
        self.unit_cost = float(unit_cost)
        self.total_cost = self.quantity * self.unit_cost
        self.status = 'pending'  # pending, received, cancelled
        self.created_at = datetime.now().isoformat()

class Sale:
    """Sale/Order model"""
    def __init__(self, customer_id, total_amount, payment_method='cash'):
        self.id = str(uuid.uuid4())
        self.customer_id = customer_id
        self.total_amount = float(total_amount)
        self.payment_method = payment_method
        self.status = 'pending'  # pending, confirmed, completed, cancelled
        self.items = []
        self.created_at = datetime.now().isoformat()

class Inventory:
    """Inventory model"""
    def __init__(self, product_id, quantity=0, reorder_level=10):
        self.id = str(uuid.uuid4())
        self.product_id = product_id
        self.quantity = int(quantity)
        self.reorder_level = int(reorder_level)
        self.last_updated = datetime.now().isoformat()