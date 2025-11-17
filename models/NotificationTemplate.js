// models/NotificationTemplate.js
import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  type: {
    type: String,
    required: true,
    enum: [
      'ride_requested',
      'ride_accepted',
      'ride_cancelled',
      'driver_en_route',
      'driver_arrived',
      'ride_started',
      'ride_completed',
      'payment_successful',
      'payment_failed',
      'refund_processed',
      'driver_approved',
      'document_expired',
      'promotion_offer',
      'sos_activated',
      'new_rating',
      'rating_reminder'
    ]
  },
  
  category: {
    type: String,
    enum: ['ride', 'payment', 'system', 'safety', 'promotion', 'rating'],
    required: true
  },
  
  // Template content for different channels - WITH OPTIONAL FIELDS
  content: {
    inApp: {
      title: {
        type: String,
        required: true,
        maxlength: 100
      },
      message: {
        type: String,
        required: true,
        maxlength: 500
      }
    },
    
    push: {
      title: {
        type: String,
        required: true,
        maxlength: 50
      },
      body: {
        type: String,
        required: true,
        maxlength: 150
      }
    },
    
    // ✅ SMS fields are now optional
    sms: {
      body: {
        type: String,
        maxlength: 160,
        default: '' // Optional with default empty string
      }
    },
    
    // ✅ Email fields are now optional
    email: {
      subject: {
        type: String,
        maxlength: 100,
        default: '' // Optional with default empty string
      },
      template: {
        type: String,
        default: '' // Optional with default empty string
      }
    }
  },
  
  // Default settings
  defaultSettings: {
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    channels: {
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }, // Default to false since fields are optional
      email: { type: Boolean, default: false } // Default to false since fields are optional
    },
    
    userGroups: [{
      type: String,
      enum: ['all', 'drivers', 'passengers', 'new_users', 'vip']
    }]
  },
  
  // Template variables
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    sampleValue: {
      type: String,
      required: true
    }
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  version: {
    type: String,
    default: '1.0'
  },
  
  // Metadata
  description: {
    type: String,
    required: true
  },
  
  notes: String
}, {
  timestamps: true
});

// Method to render template with variables
notificationTemplateSchema.methods.render = function(variables = {}) {
  const rendered = {};
  
  // Render each channel's content
  Object.keys(this.content).forEach(channel => {
    rendered[channel] = {};
    
    Object.keys(this.content[channel]).forEach(field => {
      let text = this.content[channel][field];
      
      // Only process if text exists (not empty/default)
      if (text && text.trim() !== '') {
        // Replace variables in template
        Object.keys(variables).forEach(variable => {
          const placeholder = `{{${variable}}}`;
          text = text.replace(new RegExp(placeholder, 'g'), variables[variable] || '');
        });
      }
      
      rendered[channel][field] = text;
    });
  });
  
  return rendered;
};

// Enhanced render method that handles missing content gracefully
notificationTemplateSchema.methods.renderSafe = function(variables = {}) {
  const rendered = this.render(variables);
  
  // Ensure all channels have at least empty objects
  const requiredChannels = ['inApp', 'push', 'sms', 'email'];
  requiredChannels.forEach(channel => {
    if (!rendered[channel]) {
      rendered[channel] = {};
    }
  });
  
  return rendered;
};

// Static method to get template by type
notificationTemplateSchema.statics.getByType = function(type) {
  return this.findOne({ type, isActive: true });
};

// Static method to get templates by category
notificationTemplateSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Static method to check if template has specific channel content
notificationTemplateSchema.methods.hasChannelContent = function(channel) {
  const channelContent = this.content[channel];
  if (!channelContent) return false;
  
  // Check if any field in the channel has content
  return Object.values(channelContent).some(value => 
    value && value.toString().trim() !== ''
  );
};

// Static method to get available channels for template
notificationTemplateSchema.methods.getAvailableChannels = function() {
  const channels = ['inApp', 'push']; // These are always available
  
  if (this.hasChannelContent('sms')) {
    channels.push('sms');
  }
  
  if (this.hasChannelContent('email')) {
    channels.push('email');
  }
  
  return channels;
};

// Pre-save middleware to clean empty optional fields
notificationTemplateSchema.pre('save', function(next) {
  // Clean SMS if body is empty
  if (this.content.sms && (!this.content.sms.body || this.content.sms.body.trim() === '')) {
    this.content.sms.body = '';
  }
  
  // Clean Email if fields are empty
  if (this.content.email) {
    if (!this.content.email.subject || this.content.email.subject.trim() === '') {
      this.content.email.subject = '';
    }
    if (!this.content.email.template || this.content.email.template.trim() === '') {
      this.content.email.template = '';
    }
  }
  
  next();
});

// Indexes
notificationTemplateSchema.index({ type: 1, isActive: 1 });
notificationTemplateSchema.index({ category: 1 });
notificationTemplateSchema.index({ isActive: 1 });

export default mongoose.model('NotificationTemplate', notificationTemplateSchema);