# NutriPlan Lite - System Workflow & Error Analysis

## System Architecture Overview

### Core Components
1. **Frontend Layer** (Vanilla JavaScript + Tailwind CSS)
   - Client-side SPA with three main views: Landing, Dashboard, AI Helper
   - Glassmorphic UI with GSAP animations
   - Responsive design for mobile/desktop

2. **Data Layer** (Dual-Mode Operation)
   - **Primary**: Supabase (PostgreSQL) with Row Level Security
   - **Fallback**: Browser localStorage ("Demo Mode")

3. **AI Layer** (Gemini API Integration)
   - AI Quick Log: Natural language food parsing
   - AI Coach: Context-aware nutrition advice

4. **Visualization Layer** (Chart.js)
   - Real-time nutrition metrics
   - Weekly trend analysis
   - Progress tracking

### Data Flow Architecture
```
User Input → Client Validation → API Gateway → 
├─ Supabase (if configured)
└─ localStorage (fallback)
```

## Detailed Workflow

### 1. Application Initialization
1. Load `index.html` with all CDN scripts
2. Initialize app through `app.js`
3. Check for Supabase configuration via `storage.js`
4. Load user profile from DB or localStorage
5. Initialize dashboard with default metrics

### 2. Food Logging Workflow
```
User Input → Food Form Validation → 
├─ AI Quick Log (if enabled) → Gemini API → Parsed Food Data
└─ Manual Input → Direct Food Entry
```
→ Store in `food_logs` table or localStorage
→ Update dashboard metrics in real-time
→ Trigger weekly chart updates

### 3. Data Synchronization Flow
```
Local Changes → Dequeuing System → 
├─ Supabase Sync (if online)
└─ localStorage persistence
```

## Critical Error Points & Vulnerabilities

### 1. Database Configuration Errors
**Risk Level**: High
- **Error**: Missing Supabase keys
- **Impact**: App fails to start
- **Solution**: Check `storage.js` for proper initialization
- **Prevention**: Validate keys before app load

### 2. Network Dependency Issues
**Risk Level**: Medium
- **Error**: Offline with Supabase configuration
- **Impact**: Data loss if fallback not implemented
- **Solution**: localStorage fallback must be robust
- **Prevention**: Implement offline detection

### 3. AI API Failures
**Risk Level**: Medium
- **Error**: Gemini API rate limits/down
- **Impact**: AI features unavailable
- **Solution**: Graceful degradation to manual input
- **Prevention**: API timeout and retry logic

### 4. Data Consistency Issues
**Risk Level**: High
- **Error**: Duplicate entries or corruption
- **Impact**: Inaccurate tracking
- **Solution**: Implement data validation
- **Prevention**: Unique constraints on food logs

### 5. Memory Leaks
**Risk Level**: Medium
- **Error**: Improper cleanup of event listeners
- **Impact**: Performance degradation
- **Solution**: Proper disposal in `navigation.js`
- **Prevention**: WeakMap for tracking listeners

### 6. Cross-Browser Compatibility
**Risk Level**: Medium
- **Error**: CSS rendering issues (especially Windows)
- **Impact**: UI inconsistencies
- **Solution**: Fallback styles for select elements
- **Prevention**: Browser-specific CSS rules

## Error Prevention Checklist

### Database Layer
- [ ] Validate Supabase connection string format
- [ ] Implement connection timeout (5 seconds)
- [ ] Set up proper error boundaries
- [ ] Test RLS policies before deployment

### Frontend Layer
- [ ] Validate all form inputs before submission
- [ ] Implement proper error states for all operations
- [ ] Add loading indicators for async operations
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

### AI Integration
- [ ] Implement API rate limiting (60 requests/minute)
- [ ] Add exponential backoff for failed requests
- [ ] Validate AI responses before storing
- [ ] Provide manual fallback for all AI features

### Performance Monitoring
- [ ] Track memory usage patterns
- [ ] Monitor chart rendering performance
- [ ] Implement lazy loading for non-critical features
- [ ] Profile startup time optimization

## Debugging Strategies

### 1. Console Logging Hierarchy
```javascript
// Error level
console.error('DB Connection Failed:', error);

// Warning level
console.warn('AI Service Unavailable, using fallback');

// Info level
console.info('User profile loaded from localStorage');

// Debug level (development only)
console.debug('Component state:', this.state);
```

### 2. Error Boundary Pattern
```javascript
try {
    // Risky operation
} catch (error) {
    // Fallback behavior
    this.handleGracefulDegradation(error);
}
```

### 3. State Validation
- Validate user profile data structure
- Check food log entries for required fields
- Verify macro calculations are within bounds
- Ensure water targets are reasonable (500-10000ml)

## Recovery Procedures

### 1. Database Recovery
1. Check Supabase dashboard for connection status
2. Verify API keys are correct
3. Test RLS policies
4. Restore from backup if necessary

### 2. LocalStorage Recovery
1. Clear corrupted localStorage data
2. Reset to default profile
3. Re-populate from recent entries
4. Verify all metrics are recalculated

### 3. AI Service Recovery
1. Check Gemini API status
2. Reset API configuration
3. Clear AI cache
4. Restart AI services

## Testing Scenarios

### 1. Error State Testing
- Simulate offline mode with Supabase configured
- Test AI service unavailability
- Validate form validation failures
- Check memory usage under heavy load

### 2. Recovery Testing
- Test automatic fallback to localStorage
- Verify data recovery after corruption
- Check AI service restoration
- Test reconnection to Supabase

### 3. Performance Testing
- Monitor memory usage during long sessions
- Test chart rendering with large datasets
- Validate animation performance on mobile
- Check startup time optimization