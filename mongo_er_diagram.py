#!/usr/bin/env python3
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Set style
plt.style.use('seaborn-v0_8')

# Create figure and axis
fig, ax = plt.subplots(figsize=(14, 10))

# Define entity positions
positions = {
    'User': (2, 9),
    'GameSystem': (8, 9),
    'Plugin': (8, 5),
    'Actor': (2, 5),
    'Item': (5, 2),
    'GameSystemActorType': (8, 11),  # Sub-document of GameSystem
    'GameSystemItemType': (11, 7),   # Sub-document of GameSystem
}

# Define entity fields
entity_fields = {
    'User': [
        'id: ObjectId',
        'username: String (unique)',
        'email: String (unique)',
        'password: String',
        'googleId: String (unique, optional)',
        'displayName: String (optional)',
        'avatar: String (optional)',
        'isAdmin: Boolean',
        'createdAt: Date',
        'updatedAt: Date'
    ],
    'GameSystem': [
        'id: ObjectId',
        'name: String',
        'version: String',
        'description: String (optional)',
        'author: String (optional)',
        'website: String (optional)',
        'actorTypes: [GameSystemActorType]',
        'itemTypes: [GameSystemItemType]',
        'createdAt: Date',
        'updatedAt: Date'
    ],
    'GameSystemActorType': [
        'id: ObjectId',
        'name: String',
        'description: String (optional)',
        'dataSchema: Mixed',
        'uiComponent: String (optional)'
    ],
    'GameSystemItemType': [
        'id: ObjectId',
        'name: String',
        'description: String (optional)',
        'dataSchema: Mixed',
        'uiComponent: String (optional)'
    ],
    'Plugin': [
        'id: ObjectId',
        'name: String',
        'version: String',
        'description: String (optional)',
        'author: String (optional)',
        'website: String (optional)',
        'type: String (enum)',
        'enabled: Boolean',
        'gameSystemId: ObjectId (ref: GameSystem)',
        'createdAt: Date',
        'updatedAt: Date'
    ],
    'Actor': [
        'id: ObjectId',
        'name: String',
        'type: String',
        'img: String (optional)',
        'description: String (optional)',
        'gameSystemId: ObjectId (ref: GameSystem)',
        'data: Mixed',
        'createdBy: ObjectId (ref: User)',
        'updatedBy: ObjectId (ref: User)',
        'createdAt: Date',
        'updatedAt: Date'
    ],
    'Item': [
        'id: ObjectId',
        'name: String',
        'type: String',
        'img: String (optional)',
        'description: String (optional)',
        'gameSystemId: ObjectId (ref: GameSystem)',
        'data: Mixed',
        'createdBy: ObjectId (ref: User)',
        'updatedBy: ObjectId (ref: User)',
        'createdAt: Date',
        'updatedAt: Date'
    ]
}

# Define relationships
relationships = [
    ('Actor', 'GameSystem', '* : 1', 'gameSystemId'),
    ('Actor', 'User', '* : 1', 'createdBy'),
    ('Actor', 'User', '* : 1', 'updatedBy'),
    ('Item', 'GameSystem', '* : 1', 'gameSystemId'),
    ('Item', 'User', '* : 1', 'createdBy'),
    ('Item', 'User', '* : 1', 'updatedBy'),
    ('Plugin', 'GameSystem', '* : 1', 'gameSystemId'),
    ('GameSystemActorType', 'GameSystem', 'embedded', ''),
    ('GameSystemItemType', 'GameSystem', 'embedded', '')
]

# Draw entities
def draw_entity(name, pos, fields):
    x, y = pos
    
    # Calculate height based on number of fields
    height = 0.5 + len(fields) * 0.25
    
    # Main entity box
    rect = patches.Rectangle((x, y), 3, height, linewidth=1, edgecolor='black', facecolor='lightblue', alpha=0.7)
    ax.add_patch(rect)
    
    # Title box
    title_rect = patches.Rectangle((x, y + height - 0.5), 3, 0.5, linewidth=1, edgecolor='black', facecolor='steelblue', alpha=0.9)
    ax.add_patch(title_rect)
    
    # Add title text
    ax.text(x + 1.5, y + height - 0.25, name, ha='center', va='center', fontsize=12, fontweight='bold', color='white')
    
    # Add fields
    for i, field in enumerate(fields):
        y_pos = y + height - 0.5 - (i + 1) * 0.25
        ax.text(x + 0.1, y_pos + 0.125, field, ha='left', va='center', fontsize=9)
    
    return (x, y, x + 3, y + height)

# Draw all entities and store their boundaries
entity_bounds = {}
for entity, pos in positions.items():
    entity_bounds[entity] = draw_entity(entity, pos, entity_fields[entity])

# Draw relationships
for start_entity, end_entity, rel_type, field in relationships:
    start_x, start_y, start_x2, start_y2 = entity_bounds[start_entity]
    end_x, end_y, end_x2, end_y2 = entity_bounds[end_entity]
    
    # Determine start and end points
    if start_x < end_x:  # Start entity is to the left of end entity
        start_point = (start_x2, (start_y + start_y2) / 2)
        end_point = (end_x, (end_y + end_y2) / 2)
    elif start_x > end_x:  # Start entity is to the right of end entity
        start_point = (start_x, (start_y + start_y2) / 2)
        end_point = (end_x2, (end_y + end_y2) / 2)
    elif start_y < end_y:  # Start entity is below end entity
        start_point = ((start_x + start_x2) / 2, start_y2)
        end_point = ((end_x + end_x2) / 2, end_y)
    else:  # Start entity is above end entity
        start_point = ((start_x + start_x2) / 2, start_y)
        end_point = ((end_x + end_x2) / 2, end_y2)
    
    # Draw arrow
    if rel_type == 'embedded':
        ax.plot([start_point[0], end_point[0]], [start_point[1], end_point[1]], 'k-', linewidth=1.5, linestyle='--')
    else:
        ax.arrow(start_point[0], start_point[1], 
                end_point[0] - start_point[0], end_point[1] - start_point[1],
                head_width=0.1, head_length=0.2, fc='black', ec='black', length_includes_head=True)
    
    # Add relationship text
    mid_x = (start_point[0] + end_point[0]) / 2
    mid_y = (start_point[1] + end_point[1]) / 2
    
    if rel_type == 'embedded':
        text = "Embedded Document"
    else:
        text = rel_type
        
    # Add field name if provided
    if field:
        text += f"\n({field})"
    
    ax.text(mid_x, mid_y, text, ha='center', va='center', fontsize=8, 
            bbox=dict(facecolor='white', alpha=0.8, edgecolor='none'))

# Configure the plot
ax.set_xlim(0, 15)
ax.set_ylim(0, 13)
ax.axis('off')
plt.title('Dungeon Lab - MongoDB Entity Relationship Diagram', fontsize=16, pad=20)

# Add legend
legend_elements = [
    patches.Rectangle((0, 0), 1, 1, linewidth=1, edgecolor='black', facecolor='lightblue', alpha=0.7, label='Entity'),
    patches.Patch(facecolor='white', edgecolor='black', label='Relationship'),
    patches.Patch(facecolor='white', edgecolor='black', linestyle='--', label='Embedded Document')
]
ax.legend(handles=legend_elements, loc='upper right')

# Save the diagram
plt.tight_layout()
plt.savefig('mongo_er_diagram.png', dpi=300, bbox_inches='tight')
print("MongoDB ER diagram saved as 'mongo_er_diagram.png'") 