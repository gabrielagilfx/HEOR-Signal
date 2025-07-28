"""Add thread-level preferences and onboarding fields

Revision ID: add_thread_preferences
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_thread_preferences'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to threads table
    op.add_column('threads', sa.Column('onboarding_completed', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('threads', sa.Column('selected_categories', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('threads', sa.Column('preference_expertise', sa.String(), nullable=True))
    op.add_column('threads', sa.Column('conversation_title', sa.String(), nullable=True))
    op.add_column('threads', sa.Column('last_activity', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()))


def downgrade():
    # Remove the columns we added
    op.drop_column('threads', 'last_activity')
    op.drop_column('threads', 'conversation_title')
    op.drop_column('threads', 'preference_expertise')
    op.drop_column('threads', 'selected_categories')
    op.drop_column('threads', 'onboarding_completed')