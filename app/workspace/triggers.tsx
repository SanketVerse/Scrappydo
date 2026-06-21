import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface EmailTriggerProps {
    onTriggerSetup: (triggerConfig: {
        condition: string;
        email: string;
        prompt: string;
        isEnabled: boolean;
    }) => void;
}

const EmailTrigger: React.FC<EmailTriggerProps> = ({ onTriggerSetup }) => {
    const [condition, setCondition] = useState('promptMatch');
    const [email, setEmail] = useState('');
    const [prompt, setPrompt] = useState('');
    const [isEnabled, setIsEnabled] = useState(false);

    const handleSetupTrigger = () => {
        if (email && prompt) {
            onTriggerSetup({
                condition,
                email,
                prompt,
                isEnabled
            });
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 backdrop-blur-md bg-card/50 rounded-xl border border-border/50 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center">
                    <Bell className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                    Content Trigger
                </h2>
                <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm">Trigger Enabled</span>
                    <Switch 
                        checked={isEnabled}
                        onCheckedChange={setIsEnabled}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-1">
                    <label className="text-xs sm:text-sm font-medium">Trigger Condition</label>
                    <Select value={condition} onValueChange={setCondition}>
                        <SelectTrigger className="bg-background/50 backdrop-blur-sm text-xs sm:text-base">
                            <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="promptMatch">Prompt Match</SelectItem>
                            <SelectItem value="specificData">Specific Data Found</SelectItem>
                            <SelectItem value="importantUpdate">Important Update</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 sm:col-span-1">
                    <label className="text-xs sm:text-sm font-medium flex items-center">
                        <Mail className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        Email Address
                    </label>
                    <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-background/50 backdrop-blur-sm text-xs sm:text-base"
                    />
                </div>

                <div className="flex items-end sm:col-span-1">
                    <Button
                        className="w-full bg-primary/90 hover:bg-primary/100 backdrop-blur-sm transition-all duration-300 text-xs sm:text-base"
                        onClick={handleSetupTrigger}
                        disabled={!email || !prompt}
                    >
                        Setup Trigger
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium flex items-center">
                    <AlertCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Trigger Prompt
                </label>
                <Textarea
                    placeholder="Enter a prompt to check against scraped content. If the content matches or contains this prompt, an email will be triggered."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="resize-none bg-background/50 backdrop-blur-sm min-h-[100px] text-xs sm:text-base"
                />
            </div>
        </div>
    );
};

export default EmailTrigger;