/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react'; 
import { Input } from "@/components/ui/input"; 
import { Button } from "@/components/ui/button"; 
import { Calendar } from "@/components/ui/calendar"; 
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"; 
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Clock, Repeat2, Calendar as CalendarIcon, Check } from "lucide-react";  

interface ScrapingScheduleProps {     
  onSchedule: (schedule: {         
    frequency: string;         
    time: string;         
    startDate: Date;     
  }) => void; 
}  

const ScrapingSchedule: React.FC<ScrapingScheduleProps> = ({ onSchedule }) => {     
  const [frequency, setFrequency] = useState('daily');     
  const [time, setTime] = useState('12:00');     
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDetails, setScheduledDetails] = useState<string>('');

  const handleSchedule = () => {
    if (startDate && time) {
      const scheduleData = {
        frequency,
        time,
        startDate
      };
      
      // Pass the data to parent component
      onSchedule(scheduleData);
      
      // Set local state to show confirmation
      setIsScheduled(true);
      
      // Create a readable schedule summary
      const formattedDate = startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      setScheduledDetails(`${frequency[0].toUpperCase() + frequency.slice(1)} at ${time}, starting ${formattedDate}`);
      
      // Reset the scheduled confirmation after 5 seconds
      setTimeout(() => {
        setIsScheduled(false);
      }, 5000);
    }
  };

  const getNextRunText = () => {
    if (!startDate || !time) return '';
    
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date(startDate);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If the time for today has already passed, adjust based on frequency
    const now = new Date();
    if (nextRun < now) {
      if (frequency === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (frequency === 'weekly') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (frequency === 'monthly') {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }
    
    return `Next run: ${nextRun.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })}`;
  };

  return (         
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">                
          <Repeat2 className="mr-2 h-5 w-5" />                
          Scraping Schedule             
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">                
          <label className="text-sm font-medium">Frequency</label>                
          <Select value={frequency} onValueChange={setFrequency}>                    
            <SelectTrigger className="w-full bg-background/50">                        
              <SelectValue placeholder="Select frequency" />                    
            </SelectTrigger>                    
            <SelectContent>                        
              <SelectItem value="daily">Daily</SelectItem>                        
              <SelectItem value="weekly">Weekly</SelectItem>                        
              <SelectItem value="monthly">Monthly</SelectItem>                    
            </SelectContent>                
          </Select>            
        </div>              

        <div className="space-y-2">                
          <label className="text-sm font-medium flex items-center">                    
            <Clock className="mr-2 h-4 w-4" />                    
            Time of Day                 
          </label>                
          <Input                    
            type="time"                    
            value={time}                    
            onChange={(e) => setTime(e.target.value)}                    
            className="w-full bg-background/50"                
          />            
        </div>                  

        <div className="space-y-2">                
          <label className="text-sm font-medium flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Start Date
          </label>
          <div className="relative">
            <div className="flex justify-center sm:justify-start">                    
              <Calendar                        
                mode="single"                        
                selected={startDate}                        
                onSelect={setStartDate}                        
                className="rounded-md border bg-card"                    
              />                
            </div>
          </div>           
        </div>              

        <Button                
          className="w-full bg-primary hover:bg-primary/90 transition-all duration-300"                
          onClick={handleSchedule}            
        >                
          Schedule Scraping            
        </Button>
        
        {startDate && time && (
          <p className="text-xs text-muted-foreground text-center">
            {getNextRunText()}
          </p>
        )}
      </CardContent>
      
      {isScheduled && (
        <CardFooter className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-b-xl flex items-center justify-center space-x-2">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Scheduled: {scheduledDetails}</span>
        </CardFooter>
      )}
    </Card>     
  ); 
};  

export default ScrapingSchedule;