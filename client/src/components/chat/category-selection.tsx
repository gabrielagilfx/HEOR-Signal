import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
// HEOR Signal Data Categories
const CATEGORIES = [
  {
    id: "regulatory",
    name: "Regulatory Alerts",
    description: "FDA approvals, recalls, labeling changes, and regulatory updates",
    icon: "fas fa-gavel",
  },
  {
    id: "clinical",
    name: "Clinical Trial Updates", 
    description: "New studies, status changes, and results from ClinicalTrials.gov",
    icon: "fas fa-microscope",
  },
  {
    id: "market",
    name: "Market Access & Payer News",
    description: "PBM formulary changes, ICER reports, and CMS policy updates", 
    icon: "fas fa-handshake",
  },
  {
    id: "rwe",
    name: "Real-World Evidence & Public Health",
    description: "CDC WONDER data, AHRQ insights, and disease trend analysis",
    icon: "fas fa-chart-bar",
  },
];

interface CategorySelectionProps {
  onConfirm: (categories: string[]) => void;
  isLoading?: boolean;
  initialSelected?: string[];
}

export function CategorySelection({ onConfirm, isLoading, initialSelected = [] }: CategorySelectionProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelected);

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setSelectedCategories(prev => 
      checked 
        ? [...prev, categoryId]
        : prev.filter(id => id !== categoryId)
    );
  };

  const handleConfirm = () => {
    if (selectedCategories.length > 0) {
      onConfirm(selectedCategories);
    }
  };

  return (
    <Card className="bg-muted rounded-xl p-5 mt-4">
      <h4 className="font-semibold text-foreground mb-4 flex items-center">
        <i className="fas fa-list-check text-primary mr-2"></i>
        Select Your Data Categories:
      </h4>
      
      <div className="space-y-3">
        {CATEGORIES.map((category) => (
          <label 
            key={category.id}
            className="flex items-start p-4 bg-card rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
          >
            <Checkbox
              className="mt-1 mr-4"
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
            />
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <i className={`${category.icon} text-primary text-sm mr-2`}></i>
                <span className="font-medium text-foreground group-hover:text-primary">
                  {category.name}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {category.description}
              </p>
            </div>
          </label>
        ))}
      </div>
      
      <Button
        onClick={handleConfirm}
        disabled={selectedCategories.length === 0 || isLoading}
        className="w-full mt-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
      >
        {isLoading ? (
          <>
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Processing...
          </>
        ) : (
          <>
            <i className="fas fa-check mr-2"></i>
            Confirm Selection
          </>
        )}
      </Button>
    </Card>
  );
}
