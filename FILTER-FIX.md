# Relation Property Filter Fix

## Problem
When filtering a relation property with "contains" and typing "Mike", it searched the raw UUID values instead of the resolved display names, finding nothing.

## Root Cause
In `evaluateFilter()`, relation type filtering was treated like multi_select - checking if the UUID array included the filter text:
```javascript
case 'contains': return values.includes(filterValue);  // Checking UUIDs!
```

## Solution (3 parts)

### 1. Pass property to evaluateFilter
Modified `applyFilters()` to pass the full property object (not just type) for relation properties:
```javascript
return evaluateFilter(recordValue, operator, value, prop.type, prop);
```

### 2. Resolve UUIDs to display names in filter
Updated relation handling in `evaluateFilter()`:
```javascript
if (type === 'relation') {
  const values = Array.isArray(recordValue) ? recordValue : [];
  const relatedBaseId = prop?.options?.relatedBaseId;
  
  if (operator === 'contains' || operator === 'does_not_contain') {
    const searchText = (filterValue || '').toString().toLowerCase();
    
    // Get display names from the relation cache
    const displayNames = values.map(recordId => {
      const cachedName = relationCache.records[relatedBaseId]?.[recordId];
      return cachedName || '';
    });
    
    // Join all display names and search
    const combinedText = displayNames.join(' ').toLowerCase();
    const matches = combinedText.includes(searchText);
    
    return operator === 'contains' ? matches : !matches;
  }
  return true;
}
```

### 3. Preload relation cache
Added `relationCache.preloadForBase(base)` method and call it from `openBase()` to ensure relation data is cached before user filters.

## Testing
1. Open a base with relation properties (e.g., Notes with People relation)
2. Create a note linked to "Mike Thompson"
3. Filter: People → contains → "Mike"
4. ✅ Should now show the note

## Commit
`1a051bb` - Fix relation property filtering to search display names instead of UUIDs
