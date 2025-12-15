import React from 'react';
import { Button, Card, Input, Badge, StatCard } from './ui';
import { Package, CheckCircle, IndianRupee } from 'lucide-react';

export const StyleGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Style Guide</h1>
      <p className="text-slate-600">Preview of design tokens and UI primitives.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-2">Buttons</h3>
          <div className="flex gap-2 flex-wrap items-center">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-2">Stat Card</h3>
          <StatCard title="Revenue" value="₹12,345" icon={IndianRupee} colorClass="bg-orange-600 text-orange-600" />
        </Card>

        <Card>
          <h3 className="font-semibold mb-2">Form Controls</h3>
          <Input label="Text" placeholder="Enter value" />
          <Input label="Multiline" multiline rows={3} placeholder="Paste content" />
        </Card>

        <Card>
          <h3 className="font-semibold mb-2">Badges</h3>
          <div className="flex gap-2 items-center">
            <Badge status="pending" />
            <Badge status="fetched" />
            <Badge status="calculated" />
            <Badge status="error" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StyleGuide;
