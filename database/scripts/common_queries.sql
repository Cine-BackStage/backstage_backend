-- =====================================
-- Common Queries for Cinema Management System
-- =====================================

-- 1. Get all available sessions with movie and room details
SELECT 
    s.id as session_id,
    m.title as movie_title,
    m.duration_min,
    r.name as room_name,
    r.room_type,
    s.start_time,
    s.end_time,
    s.status,
    rtp.price as base_price,
    (r.capacity - COALESCE(ticket_count.sold, 0)) as available_seats
FROM session s
JOIN movie m ON s.movie_id = m.id
JOIN room r ON s.room_id = r.id
JOIN room_type_price rtp ON r.room_type = rtp.room_type
LEFT JOIN (
    SELECT session_id, COUNT(*) as sold
    FROM ticket
    GROUP BY session_id
) ticket_count ON s.id = ticket_count.session_id
WHERE s.status = 'SCHEDULED'
AND s.start_time > CURRENT_TIMESTAMP
ORDER BY s.start_time;

-- 2. Get seat availability for a specific session
SELECT 
    s.row_label,
    s.number,
    s.id as seat_id,
    s.is_accessible,
    CASE WHEN t.id IS NULL THEN 'AVAILABLE' ELSE 'SOLD' END as status
FROM session sess
JOIN room r ON sess.room_id = r.id
JOIN seat s ON r.seatmap_id = s.seatmap_id
LEFT JOIN ticket t ON t.session_id = sess.id 
    AND t.seatmap_id = s.seatmap_id 
    AND t.seat_id = s.id
WHERE sess.id = $1  -- Replace with session_id parameter
ORDER BY s.row_label, s.number;

-- 3. Daily sales report
SELECT 
    DATE(s.created_at) as sale_date,
    COUNT(s.id) as total_sales,
    SUM(s.grand_total) as total_revenue,
    AVG(s.grand_total) as avg_sale_value,
    COUNT(DISTINCT s.buyer_cpf) as unique_customers
FROM sale s
WHERE s.status = 'FINALIZED'
AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(s.created_at)
ORDER BY sale_date DESC;

-- 4. Inventory low stock report
SELECT 
    i.sku,
    i.name,
    i.qty_on_hand,
    i.reorder_level,
    i.unit_price,
    (i.reorder_level - i.qty_on_hand) as qty_to_order,
    CASE 
        WHEN f.sku IS NOT NULL THEN 'Food'
        WHEN c.sku IS NOT NULL THEN 'Collectable'
        ELSE 'Other'
    END as item_type
FROM inventory_item i
LEFT JOIN food f ON i.sku = f.sku
LEFT JOIN collectable c ON i.sku = c.sku
WHERE i.qty_on_hand <= i.reorder_level
ORDER BY (i.reorder_level - i.qty_on_hand) DESC;

-- 5. Top selling movies
SELECT 
    m.title,
    m.genre,
    COUNT(t.id) as tickets_sold,
    SUM(t.price) as total_revenue,
    AVG(t.price) as avg_ticket_price
FROM movie m
JOIN session s ON m.id = s.movie_id
JOIN ticket t ON s.id = t.session_id
GROUP BY m.id, m.title, m.genre
ORDER BY tickets_sold DESC
LIMIT 10;

-- 6. Customer purchase history
SELECT 
    p.full_name,
    p.email,
    s.created_at as purchase_date,
    s.grand_total,
    s.status,
    COUNT(si.id) as items_purchased
FROM person p
JOIN customer c ON p.cpf = c.cpf
JOIN sale s ON c.cpf = s.buyer_cpf
LEFT JOIN sale_item si ON s.id = si.sale_id
WHERE p.cpf = $1  -- Replace with customer CPF parameter
GROUP BY p.full_name, p.email, s.id, s.created_at, s.grand_total, s.status
ORDER BY s.created_at DESC;

-- 7. Employee sales performance
SELECT 
    p.full_name as employee_name,
    e.employee_id,
    COUNT(s.id) as total_sales,
    SUM(s.grand_total) as total_revenue,
    AVG(s.grand_total) as avg_sale_value,
    DATE_TRUNC('month', s.created_at) as month
FROM person p
JOIN employee e ON p.cpf = e.cpf
JOIN sale s ON e.cpf = s.cashier_cpf
WHERE s.status = 'FINALIZED'
AND s.created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY p.full_name, e.employee_id, DATE_TRUNC('month', s.created_at)
ORDER BY month DESC, total_revenue DESC;

-- 8. Room utilization report
SELECT 
    r.name as room_name,
    r.room_type,
    r.capacity,
    COUNT(s.id) as sessions_scheduled,
    COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) as sessions_completed,
    COALESCE(AVG(ticket_stats.tickets_sold), 0) as avg_tickets_per_session,
    COALESCE(AVG(ticket_stats.occupancy_rate), 0) as avg_occupancy_rate
FROM room r
LEFT JOIN session s ON r.id = s.room_id
LEFT JOIN (
    SELECT 
        session_id,
        COUNT(*) as tickets_sold,
        (COUNT(*)::float / r.capacity * 100) as occupancy_rate
    FROM ticket t
    JOIN session s ON t.session_id = s.id
    JOIN room r ON s.room_id = r.id
    GROUP BY session_id, r.capacity
) ticket_stats ON s.id = ticket_stats.session_id
WHERE s.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY r.id, r.name, r.room_type, r.capacity
ORDER BY avg_occupancy_rate DESC;

-- 9. Discount code usage analysis
SELECT 
    dc.code,
    dc.description,
    dc.type,
    dc.value,
    COUNT(sd.sale_id) as times_used,
    SUM(CASE 
        WHEN dc.type = 'PERCENT' THEN (s.sub_total * dc.value / 100)
        ELSE dc.value 
    END) as total_discount_given,
    AVG(s.grand_total) as avg_sale_with_discount
FROM discount_code dc
LEFT JOIN sale_discount sd ON dc.code = sd.code
LEFT JOIN sale s ON sd.sale_id = s.id
WHERE dc.valid_to >= CURRENT_DATE
GROUP BY dc.code, dc.description, dc.type, dc.value
ORDER BY times_used DESC;

-- 10. Audit trail for sensitive operations
SELECT 
    al.timestamp,
    p.full_name as actor_name,
    e.employee_id,
    al.action,
    al.target_type,
    al.target_id,
    al.metadata_json
FROM audit_log al
JOIN person p ON al.actor_cpf = p.cpf
LEFT JOIN employee e ON p.cpf = e.cpf
WHERE al.action IN ('CREATE_EMPLOYEE', 'DEACTIVATE_EMPLOYEE', 'UPDATE_PRICING', 'REFUND_SALE')
ORDER BY al.timestamp DESC
LIMIT 100;