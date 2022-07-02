#!/bin/bash

# Comment/Uncomment the specific lines of files
# NOTE: Switch lines using 'sed -i' according platforms (Linux or Mac)
#
# For such a case which needs temporary comment out like:
# 1.comment out  2.do something 3.uncomment
# By specifing with files of comment ranges,
# taking care of escape for some characters are not required.
#
# Parameters:
#   arrays of paths: target_files[], comment_range_files[]
#   Note: For n=0,1,..., target_files[n] is used only for comment_range_files[n].
#
# Usage:
#  $ bash toggle_comment.sh [c,u,comment,uncomment]
#  arg is optional for comment/uncomment only mode

target_files[0]="example.yaml"
target_files[1]="example.yaml"
comment_range_files[0]="comment_range1"
comment_range_files[1]="comment_range2"

match_lines(){
  comment_range_file=$1
  target_file=$2
  mode=$3
  len_comment=$(echo $(wc -l < $comment_range_file) | xargs)

  # Get array of line nums which first line of comment range matches in the target file.
  first_line=$(sed -n '1p' $comment_range_file)
  line_nums_first_line_match=$(grep -n "$first_line" $target_file | cut -d : -f 1)
  SAVEIFS=$IFS
  IFS=$'\n'
  line_nums_first_line_match=($line_nums_first_line_match)
  IFS=$SAVEIFS

  # Check all lines in the comment_range_file are in the target_file.
  for num in "${line_nums_first_line_match[@]}"
  do
  num_save=$num
    for (( i=2; i<=$len_comment; i++ ))
    do
      num=$(($num + 1))
      line=$(sed -n ''$i'p' $comment_range_file)
      line_t=$(sed -n ''$num'p' $target_file)

      if [[ "$line" == "$line_t" || "# ""$line" == "$line_t" ]]; then

        if [[ "$i" == "$len_comment" ]]; then
          # The final line of comment range file matched.

          if [[ $mode == "comment" ]]; then
            # sed -i -E ''${num_save}','${num}'s/^(# )?/# /' $target_file  # Linux
            sed -i "" -E ''${num_save}','${num}'s/^(# )?/# /' $target_file  # Mac
          elif [[ $mode == "uncomment" ]]; then
            # sed -i -E ''${num_save}','${num}'s/^# //' $target_file  # Linux
            sed -i "" -E ''${num_save}','${num}'s/^# //' $target_file  # Mac
          fi

          return
        fi
      else
        break
      fi
    done
  done
  echo "ERROR: Target and (un)comment range lines do not match."
  exit
}

toggle_comment(){
  mode=$1
  for (( n=0; n<${#comment_range_files[@]}; n++ ))
  do
    match_lines ${comment_range_files[$n]} ${target_files[$n]} "$mode"
  done
}

# Mode: commend or uncommend. Get an arg.
if [[ "$1" == "c" || "$1" == "comment" ]]; then
  echo "Mode: comment"
  toggle_comment "comment"
  exit
elif [[ "$1" == "u" || "$1" == "uncomment" ]]; then
  echo "Mode: uncomment"
  toggle_comment "uncomment"
  exit
fi

# Main
toggle_comment "comment"

# do_something
echo "Comment Done!"
sleep 1
echo "Do something..."
sleep 1
echo "Do something..."
sleep 1
echo "Do something..."
sleep 1
toggle_comment "uncomment"
echo "UnComment Done!"
