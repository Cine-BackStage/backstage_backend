#!/bin/bash

# Cinema Management System - Interactive Demo Script
# Run this after starting the system with `make dev`

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API base URL
API_URL="http://localhost:3000"

# Function to print colored output
print_step() {
    echo -e "${BLUE}🎬 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to wait for user input
wait_for_user() {
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read
}

# Function to check if API is running
check_api() {
    print_step "Checking if API is running..."
    if curl -s "$API_URL/health" > /dev/null; then
        print_success "API is running!"
        return 0
    else
        print_error "API is not running. Please run 'make dev' first."
        return 1
    fi
}

# Function to pretty print JSON
pretty_json() {
    if command -v jq &> /dev/null; then
        jq .
    else
        cat
    fi
}

# Main demo function
main() {
    clear
    echo "🎬 Cinema Management System Demo"
    echo "================================="
    echo
    
    # Check if API is running
    if ! check_api; then
        exit 1
    fi
    
    wait_for_user
    
    # Step 1: Show API Documentation
    print_step "Step 1: API Overview"
    echo "📖 API Documentation available at: $API_URL/api"
    echo "🏥 Health check: $API_URL/health"
    curl -s "$API_URL" | pretty_json
    wait_for_user
    
    # Step 2: View Available Sessions
    print_step "Step 2: Viewing Available Movie Sessions"
    echo "📋 Fetching all available sessions..."
    curl -s "$API_URL/api/sessions" | pretty_json
    wait_for_user
    
    # Step 3: Check Seat Availability
    print_step "Step 3: Checking Seat Availability for Session 1"
    echo "💺 Getting seat map for session 1..."
    curl -s "$API_URL/api/sessions/1/seats" | pretty_json
    wait_for_user
    
    # Step 4: Purchase Tickets
    print_step "Step 4: Purchasing Tickets"
    echo "🎫 Buying tickets for seats C07 and C08..."
    TICKET_RESPONSE=$(curl -s -X POST "$API_URL/api/tickets/bulk" \
        -H "Content-Type: application/json" \
        -d '{"session_id": 1, "seat_ids": ["C07", "C08"]}')
    
    echo "$TICKET_RESPONSE" | pretty_json
    
    if echo "$TICKET_RESPONSE" | grep -q '"success":true'; then
        print_success "Tickets purchased successfully!"
    else
        print_warning "Ticket purchase failed or seats already taken. Continuing demo..."
    fi
    wait_for_user
    
    # Step 5: Create a Sale
    print_step "Step 5: Creating a New Sale"
    echo "🛒 Creating sale with customer and cashier..."
    SALE_RESPONSE=$(curl -s -X POST "$API_URL/api/sales" \
        -H "Content-Type: application/json" \
        -d '{"buyer_cpf": "12345678901", "cashier_cpf": "12345678905"}')
    
    echo "$SALE_RESPONSE" | pretty_json
    
    # Extract sale ID
    if command -v jq &> /dev/null; then
        SALE_ID=$(echo "$SALE_RESPONSE" | jq -r '.data.id')
    else
        SALE_ID="1"  # Fallback
    fi
    
    print_success "Sale created with ID: $SALE_ID"
    wait_for_user
    
    # Step 6: Add Items to Sale
    print_step "Step 6: Adding Items to Sale"
    echo "🍿 Adding popcorn to sale..."
    curl -s -X POST "$API_URL/api/sales/$SALE_ID/items" \
        -H "Content-Type: application/json" \
        -d '{"description": "Pipoca Grande", "sku": "PIPOCA_G", "quantity": 1, "unit_price": 15.50}' | pretty_json
    
    echo "🥤 Adding drink to sale..."
    curl -s -X POST "$API_URL/api/sales/$SALE_ID/items" \
        -H "Content-Type: application/json" \
        -d '{"description": "Refrigerante Médio", "sku": "REFRI_M", "quantity": 1, "unit_price": 8.50}' | pretty_json
    
    print_success "Items added to sale!"
    wait_for_user
    
    # Step 7: Apply Discount
    print_step "Step 7: Applying Discount Code"
    echo "💰 Applying 10% welcome discount..."
    DISCOUNT_RESPONSE=$(curl -s -X POST "$API_URL/api/sales/$SALE_ID/discount" \
        -H "Content-Type: application/json" \
        -d '{"discount_code": "WELCOME10"}')
    
    echo "$DISCOUNT_RESPONSE" | pretty_json
    
    if echo "$DISCOUNT_RESPONSE" | grep -q '"success":true'; then
        print_success "Discount applied!"
    else
        print_warning "Discount may already be applied or code invalid."
    fi
    wait_for_user
    
    # Step 8: View Sale Summary
    print_step "Step 8: Sale Summary"
    echo "📊 Viewing complete sale details..."
    curl -s "$API_URL/api/sales/$SALE_ID" | pretty_json
    wait_for_user
    
    # Step 9: Finalize Sale
    print_step "Step 9: Finalizing Sale with Payment"
    echo "💳 Processing card payment..."
    PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/api/sales/$SALE_ID/finalize" \
        -H "Content-Type: application/json" \
        -d '{"payments": [{"method": "CARD", "amount": 21.60}]}')
    
    echo "$PAYMENT_RESPONSE" | pretty_json
    
    if echo "$PAYMENT_RESPONSE" | grep -q '"success":true'; then
        print_success "Sale completed successfully!"
    else
        print_warning "Sale finalization may have failed. Check the response above."
    fi
    wait_for_user
    
    # Step 10: Database Exploration Hint
    print_step "Step 10: Database Exploration"
    echo "🗄️  You can explore the database using:"
    echo "   make db-shell"
    echo
    echo "📊 Sample queries to try:"
    echo "   SELECT * FROM session;"
    echo "   SELECT * FROM ticket;"
    echo "   SELECT * FROM sale;"
    wait_for_user
    
    # Final Summary
    print_step "Demo Complete!"
    echo "🎉 You've successfully:"
    echo "   ✅ Viewed movie sessions"
    echo "   ✅ Checked seat availability" 
    echo "   ✅ Purchased movie tickets"
    echo "   ✅ Created and processed a sale"
    echo "   ✅ Applied discount codes"
    echo "   ✅ Processed payments"
    echo
    echo "🌐 Services available:"
    echo "   API: $API_URL"
    echo "   PgAdmin: http://localhost:8080"
    echo
    echo "📖 Full API documentation: $API_URL/api"
    print_success "Demo completed successfully!"
}

# Run the demo
main "$@"